import { searchRakutenProducts, RakutenProduct } from './kame_buttler';
import dotenv from 'dotenv';

dotenv.config();

async function testSearchRakutenProducts() {
  console.log('Testing searchRakutenProducts function...');
  const query = "スマートスピーカー"; // テストしたいクエリ

  try {
    const products = await searchRakutenProducts(query);
    if (products.length > 0) {
      console.log(`Found ${products.length} products for query "${query}":`);
      products.forEach((product: RakutenProduct, index: number) => {
        console.log(`  ${index + 1}. Title: ${product.Title}`);
        console.log(`     URL: ${product.URL}`);
        console.log(`     Price: ${product.Price}`);
      });
    } else {
      console.log(`No products found for query "${query}".`);
    }
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testSearchRakutenProducts();
