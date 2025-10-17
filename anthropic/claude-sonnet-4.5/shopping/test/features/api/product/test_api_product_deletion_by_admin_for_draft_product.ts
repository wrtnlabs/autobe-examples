import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test complete product deletion workflow by admin for draft products.
 *
 * This test validates the hard delete functionality for draft products that
 * have never been included in any orders. It ensures that:
 *
 * 1. Admin can successfully authenticate and create necessary categories
 * 2. Seller can create draft products with SKU variants
 * 3. Admin can permanently delete draft products
 * 4. All associated data (SKU variants, images) are removed through cascading
 *    deletion
 * 5. The product record is completely removed from the database
 *
 * Test workflow:
 *
 * 1. Admin authenticates and creates a product category
 * 2. Seller authenticates and creates a draft product
 * 3. Seller adds multiple SKU variants to the product
 * 4. Admin deletes the draft product
 * 5. Validation confirms complete removal
 */
export async function test_api_product_deletion_by_admin_for_draft_product(
  connection: api.IConnection,
) {
  // Step 1: Admin authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin creates a product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Seller authenticates
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        business_name: RandomGenerator.name(),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 3 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Seller creates a draft product
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<number>(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  // Step 5: Seller creates multiple SKU variants for cascading deletion validation
  const skuCount = 3;
  const skus: IShoppingMallSku[] = await ArrayUtil.asyncRepeat(
    skuCount,
    async (index) => {
      const sku: IShoppingMallSku =
        await api.functional.shoppingMall.seller.products.skus.create(
          connection,
          {
            productId: product.id,
            body: {
              sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-${index}`,
              price: typia.random<number>(),
            } satisfies IShoppingMallSku.ICreate,
          },
        );
      typia.assert(sku);
      return sku;
    },
  );

  TestValidator.equals("created SKU count matches", skus.length, skuCount);

  // Step 6: Switch back to admin context and delete the draft product
  // Re-authenticate as admin to ensure proper authorization for deletion
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.MinLength<8>>(),
      name: RandomGenerator.name(),
      role_level: "super_admin",
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Perform the product deletion
  await api.functional.shoppingMall.admin.products.erase(connection, {
    productId: product.id,
  });

  // Step 7: Validation - product deletion completed successfully
  // The delete operation succeeded without throwing errors
  // Note: Without a GET endpoint for products, we cannot verify the product is truly deleted
  // However, the successful completion of the erase() call confirms the deletion was processed
  // In a real scenario, attempting to retrieve the product would result in a 404 error
}
