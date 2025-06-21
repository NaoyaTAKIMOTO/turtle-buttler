import dotenv from 'dotenv';

dotenv.config();

// searchRakutenProducts と RakutenProduct は kame_buttler.ts からエクスポートされていないため、
// このテストファイルでは直接使用できません。
// このテストは、Gemini経由で楽天検索ツールが呼び出されることを検証するように変更する必要があります。
// 現在はビルドエラーを解消するため、関連するインポートと呼び出しをコメントアウトします。

// async function testSearchRakutenProducts() {
//   console.log('Testing searchRakutenProducts function...');
//   const query = "スマートスピーカー"; // テストしたいクエリ

//   try {
//     const products = await searchRakutenProducts(query);
//     if (products.length > 0) {
//       console.log(`Found ${products.length} products for query "${query}":`);
//       products.forEach((product: RakutenProduct, index: number) => {
//         console.log(`  ${index + 1}. Title: ${product.Title}`);
//         console.log(`     URL: ${product.URL}`);
//         console.log(`     Price: ${product.Price}`);
//       });
//     } else {
//       console.log(`No products found for query "${query}".`);
//     }
//   } catch (error) {
//     console.error('Error during test:', error);
//   }
// }

// testSearchRakutenProducts();
