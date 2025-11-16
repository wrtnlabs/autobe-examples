import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallProductsCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductsCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate ability to retrieve the detail of a SKU immediately after its
 * creation.
 *
 * Workflow steps:
 *
 * 1. Register a seller account (receiving seller id and authentication context)
 * 2. Create a product as that seller (context is authenticated)
 * 3. Create a SKU attached to the product
 * 4. Log out (simulate no authentication required)
 * 5. Retrieve the SKU detail view with correct productId and skuId
 * 6. Validate returned business, inventory, audit, and business linkage fields
 * 7. Confirm linkage between product summary and SKU, IDs match
 * 8. Confirm correct values for price, status, and stock
 * 9. Confirm public access (no authentication error)
 */
export async function test_api_sku_detail_view_after_creation(
  connection: api.IConnection,
) {
  // 1. Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerRegNum = RandomGenerator.alphaNumeric(10);
  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(16),
    business_name: RandomGenerator.name(),
    registration_number: sellerRegNum,
    business_phone: RandomGenerator.mobile(),
    href: "https://shop.test/autobe-test",
    referrer: "https://autobe-test.origin",
    ip: null,
  } satisfies IShoppingMallSeller.ICreate;
  const seller = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert(seller);
  TestValidator.equals(
    "returned seller email matches",
    seller.email,
    sellerEmail,
  );
  TestValidator.equals(
    "registration number matches",
    seller.registration_number,
    sellerRegNum,
  );
  TestValidator.predicate("business name exists", !!seller.business_name);

  // 2. Create a product as that seller (auth context is set by join)
  const productTitle = `${RandomGenerator.paragraph({ sentences: 3 })} AutoBE`; // ensure uniqueness
  const productDescription = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
  });
  const productDefaultPrice = 12900;
  const productBusinessStatus = "draft";
  const productBody = {
    title: productTitle,
    description: productDescription,
    default_price: productDefaultPrice,
    business_status: productBusinessStatus,
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    { body: productBody },
  );
  typia.assert(product);
  TestValidator.equals(
    "product title matches input",
    product.title,
    productTitle,
  );
  TestValidator.equals(
    "seller business_name matches",
    product.seller.business_name,
    seller.business_name,
  );

  // 3. Create a SKU for this product
  const skuCode = `SKU-${RandomGenerator.alphaNumeric(10)}`;
  const skuPrice = productDefaultPrice + 1000;
  const skuStock: number & tags.Type<"int32"> = 20;
  const skuStatus = "active";
  const skuBody = {
    sku_code: skuCode,
    price: skuPrice,
    stock: skuStock,
    status: skuStatus,
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    { productId: product.id, body: skuBody },
  );
  typia.assert(sku);
  TestValidator.equals("SKU code matches input", sku.sku_code, skuCode);
  TestValidator.equals("SKU price matches input", sku.price, skuPrice);
  TestValidator.equals("SKU status is active", sku.status, skuStatus);
  TestValidator.equals(
    "SKU is linked to correct product",
    sku.product.id,
    product.id,
  );
  TestValidator.equals(
    "SKU product summary business_name equal",
    sku.product.seller.business_name,
    seller.business_name,
  );
  TestValidator.equals(
    "full product price and summary price equal",
    sku.product.default_price,
    productDefaultPrice,
  );

  // 4. Log out/simulate no authentication (public endpoint)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 5. Retrieve the SKU detail as an unauthenticated public user
  const got = await api.functional.shoppingMall.products.skus.at(unauthConn, {
    productId: product.id,
    skuId: sku.id,
  });
  typia.assert(got);
  TestValidator.equals("SKU detail returns correct id", got.id, sku.id);
  TestValidator.equals(
    "SKU detail product linkage correct",
    got.product.id,
    product.id,
  );
  TestValidator.equals("SKU detail sku_code matches", got.sku_code, skuCode);
  TestValidator.equals("SKU detail price correct", got.price, skuPrice);
  TestValidator.equals("SKU detail stock correct", got.stock, skuStock);
  TestValidator.equals("SKU detail status correct", got.status, skuStatus);
  TestValidator.equals(
    "SKU detail product summary matches",
    got.product,
    sku.product,
  );
  TestValidator.predicate(
    "SKU product created_at is ISO 8601 string",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(got.product.created_at),
  );
  TestValidator.predicate(
    "SKU created_at is ISO 8601 string",
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(got.created_at),
  );
  TestValidator.notEquals(
    "SKU detail deleted_at is null or undefined",
    got.deleted_at,
    undefined,
  );
}
