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
 * Validate successful SKU creation by a registered seller for an existing
 * product.
 *
 * Scenario:
 *
 * 1. Register a new seller
 * 2. Seller creates a product
 * 3. Seller creates a valid SKU for that product
 * 4. Try to create another SKU with same sku_code → should fail (uniqueness)
 * 5. Try to create SKU with negative price → should fail
 * 6. Try to create SKU with negative stock → should fail
 * 7. Try to create SKU with status not allowed ('invalid_status') → should fail
 * 8. On success, assert that SKU's product field refers to the created product
 * 9. Assert returned data is of correct type and values
 */
export async function test_api_sku_creation_by_seller(
  connection: api.IConnection,
) {
  // Step 1: Register a seller
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const registrationNumber = RandomGenerator.alphaNumeric(10);
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: RandomGenerator.alphaNumeric(10),
      business_name: RandomGenerator.name(),
      registration_number: registrationNumber,
      business_phone: RandomGenerator.mobile(),
      href: "https://test.app/seller-signup",
      referrer: "https://test.app/landing",
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create a product
  const productInput = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    default_price: Math.floor(1000 + Math.random() * 9000),
    business_status: "draft",
  } satisfies IShoppingMallProduct.ICreate;
  const product = await api.functional.shoppingMall.products.create(
    connection,
    {
      body: productInput,
    },
  );
  typia.assert(product);

  // Step 3: Valid SKU creation
  const skuCode = RandomGenerator.alphaNumeric(10);
  const skuInput = {
    sku_code: skuCode,
    price: 1500,
    stock: 50,
    status: "active", // allowed status per docs
  } satisfies IShoppingMallProductSku.ICreate;
  const sku = await api.functional.shoppingMall.seller.products.skus.create(
    connection,
    {
      productId: product.id,
      body: skuInput,
    },
  );
  typia.assert(sku);
  TestValidator.equals("SKU product link", sku.product.id, product.id);
  TestValidator.equals(
    "SKU code matches input",
    sku.sku_code,
    skuInput.sku_code,
  );
  TestValidator.equals("SKU price matches input", sku.price, skuInput.price);
  TestValidator.equals("SKU stock matches input", sku.stock, skuInput.stock);
  TestValidator.equals("SKU status matches input", sku.status, skuInput.status);

  // Step 4: Duplicate SKU code should fail
  await TestValidator.error("Duplicate SKU code fails", async () => {
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: { ...skuInput },
    });
  });

  // Step 5: Negative price should fail
  await TestValidator.error("Negative price not allowed", async () => {
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        ...skuInput,
        sku_code: RandomGenerator.alphaNumeric(10),
        price: -1,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  });

  // Step 6: Negative stock should fail
  await TestValidator.error("Negative stock not allowed", async () => {
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        ...skuInput,
        sku_code: RandomGenerator.alphaNumeric(10),
        stock: -5,
      } satisfies IShoppingMallProductSku.ICreate,
    });
  });

  // Step 7: Invalid status string should fail
  await TestValidator.error("Invalid SKU status fails", async () => {
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        ...skuInput,
        sku_code: RandomGenerator.alphaNumeric(10),
        status: "invalid_status",
      } satisfies IShoppingMallProductSku.ICreate,
    });
  });
}
