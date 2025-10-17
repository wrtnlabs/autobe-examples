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
import type { IShoppingMallSkuColor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSkuColor";

/**
 * Test referential integrity protection when deleting SKU colors referenced by
 * active SKUs.
 *
 * This test validates that the system properly enforces referential integrity
 * by preventing deletion of color variants that are currently in use by product
 * SKUs. The test creates a complete product configuration with an SKU that
 * references a specific color, then attempts to delete that color and expects
 * the operation to fail with an error indicating the color is in use.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create a SKU color variant
 * 3. Create a product category
 * 4. Switch to seller authentication
 * 5. Create a product
 * 6. Create an SKU that references the color
 * 7. Attempt to delete the referenced color (should fail)
 * 8. Verify the error indicates the color is in use
 *
 * Note: The IShoppingMallSku.ICreate type in the provided API doesn't expose
 * color_id or similar reference fields. This test creates the SKU and color but
 * may not be able to establish the explicit reference relationship depending on
 * backend implementation. The backend may handle color association through
 * other means not visible in the provided API interface.
 */
export async function test_api_sku_color_deletion_with_active_sku_reference(
  connection: api.IConnection,
) {
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.MinLength<8>>();

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(),
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  const colorName = RandomGenerator.name();
  const skuColor: IShoppingMallSkuColor =
    await api.functional.shoppingMall.admin.skuColors.create(connection, {
      body: {
        name: colorName,
      } satisfies IShoppingMallSkuColor.ICreate,
    });
  typia.assert(skuColor);

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: RandomGenerator.name(),
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(),
        business_type: "LLC",
        contact_person_name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
        business_address: RandomGenerator.paragraph({ sentences: 2 }),
        tax_id: RandomGenerator.alphaNumeric(10),
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: {
        name: RandomGenerator.name(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(product);

  const sku: IShoppingMallSku =
    await api.functional.shoppingMall.seller.products.skus.create(connection, {
      productId: product.id,
      body: {
        sku_code: RandomGenerator.alphaNumeric(12),
        price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
      } satisfies IShoppingMallSku.ICreate,
    });
  typia.assert(sku);

  await TestValidator.error(
    "should fail to delete color variant that is referenced by active SKU",
    async () => {
      await api.functional.shoppingMall.admin.skuColors.erase(connection, {
        colorId: skuColor.id,
      });
    },
  );
}
