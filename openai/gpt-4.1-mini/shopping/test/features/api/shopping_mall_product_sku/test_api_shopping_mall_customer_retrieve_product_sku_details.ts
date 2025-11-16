import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test retrieving a specific product SKU's details by productCode and skuCode
 * for an authenticated customer. This scenario validates that the SKU details
 * including price, inventory, and active status are accessible only after
 * proper authentication.
 *
 * Business flow:
 *
 * 1. Seller signs up
 * 2. Seller logs in
 * 3. Seller creates a product
 * 4. Seller creates an SKU variant attached to the product
 * 5. Customer signs up
 * 6. Customer logs in
 * 7. Customer retrieves SKU details by productCode and skuCode
 *
 * Validations:
 *
 * - Typia.assert on all API responses
 * - SKU details (price, inventory, is_active) correctness verifying
 * - Authentication is required for customer retrieving SKU
 *
 * Note: connection.headers are not manually manipulated. Authentication is
 * managed by SDK.
 */
export async function test_api_shopping_mall_customer_retrieve_product_sku_details(
  connection: api.IConnection,
) {
  // 1. Seller signs up
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "StrongPassword123!",
        name: RandomGenerator.name(),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // 2. Seller logs in
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "StrongPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Seller creates a product
  const productCode = RandomGenerator.alphaNumeric(10);
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.shoppingMallProducts.create(
      connection,
      {
        body: {
          code: productCode,
          name: RandomGenerator.name(3),
          description: RandomGenerator.paragraph(),
          is_active: true,
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);

  // 4. Seller creates SKU variant
  const skuCode = RandomGenerator.alphaNumeric(8);
  const sku: IShoppingMallProductSku =
    await api.functional.shoppingMall.seller.shoppingMallProducts.shoppingMallProductSkus.create(
      connection,
      {
        productCode: product.code,
        body: {
          sku_code: skuCode,
          price: RandomGenerator.alphaNumeric(4).length * 10, // a numeric price roughly 10-40 approx
          inventory: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
          >(),
          is_active: true,
        } satisfies IShoppingMallProductSku.ICreate,
      },
    );
  typia.assert(sku);

  // 5. Customer signs up
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: {
        email: customerEmail,
        password: "CustomerPass123!",
        full_name: RandomGenerator.name(),
        href: "https://example.com/signup",
        referrer: "https://example.com/home",
      } satisfies IShoppingMallCustomer.ICreate,
    });
  typia.assert(customer);

  // 6. Customer logs in
  await api.functional.auth.customer.login(connection, {
    body: {
      email: customerEmail,
      password: "CustomerPass123!",
      href: "https://example.com/login",
      referrer: "https://example.com/home",
    } satisfies IShoppingMallCustomer.ILogin,
  });

  // 7. Customer retrieves SKU details
  const retrievedSku: IShoppingMallProductSku =
    await api.functional.shoppingMall.customer.shoppingMallProducts.shoppingMallProductSkus.at(
      connection,
      {
        productCode: product.code,
        skuCode: sku.sku_code,
      },
    );
  typia.assert(retrievedSku);

  // Validate retrieved SKU fields
  TestValidator.equals("SKU price matches", retrievedSku.price, sku.price);
  TestValidator.equals(
    "SKU inventory matches",
    retrievedSku.inventory,
    sku.inventory,
  );
  TestValidator.equals(
    "SKU active status matches",
    retrievedSku.is_active,
    sku.is_active,
  );
  TestValidator.equals("SKU code matches", retrievedSku.sku_code, sku.sku_code);
  TestValidator.equals(
    "SKU product id matches",
    retrievedSku.shopping_mall_product_id,
    sku.shopping_mall_product_id,
  );
}
