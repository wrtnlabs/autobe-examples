import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test retrieving detailed information for a specific inventory transaction by
 * ID.
 *
 * This test validates the admin inventory transaction retrieval API by:
 *
 * 1. Creating admin account for authentication
 * 2. Creating seller account for product management
 * 3. Creating product category as prerequisite
 * 4. Creating product under seller account
 * 5. Creating SKU variant which generates inventory transaction
 * 6. Demonstrating the transaction retrieval API call pattern
 *
 * Note: The actual transaction ID retrieval from SKU creation is not available
 * in the provided API responses, so this test demonstrates the API pattern
 * rather than a complete end-to-end workflow.
 */
export async function test_api_inventory_transaction_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateData,
    });
  typia.assert(admin);

  // Step 2: Create seller account
  const sellerCreateData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(2),
    business_type: "corporation",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 2 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateData,
    });
  typia.assert(seller);

  // Step 3: Create product category (admin authentication already active)
  const categoryCreateData = {
    name: RandomGenerator.name(2),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateData,
    });
  typia.assert(category);

  // Step 4: Create product (seller authentication already active)
  const productCreateData = {
    name: RandomGenerator.name(3),
    base_price: typia.random<
      number & tags.Minimum<0>
    >() satisfies number as number,
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateData,
    });
  typia.assert(product);

  // Step 5: Create SKU variant (generates inventory transaction)
  const skuCreateData = {
    sku_code: RandomGenerator.alphaNumeric(12),
    price: typia.random<number & tags.Minimum<0>>() satisfies number as number,
  } satisfies IShoppingMallSku.ICreate;

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: skuCreateData,
    });
  typia.assert(sku);

  // Step 6: Demonstrate inventory transaction retrieval API pattern
  // Note: Using a mock transaction ID since the actual transaction ID is not
  // available in the SKU creation response based on provided DTO structure
  const mockTransactionId = typia.random<string & tags.Format<"uuid">>();

  const transaction: IShoppingMallInventoryTransaction =
    await api.functional.shoppingMall.admin.inventoryTransactions.at(
      connection,
      {
        transactionId: mockTransactionId,
      },
    );
  typia.assert(transaction);
}
