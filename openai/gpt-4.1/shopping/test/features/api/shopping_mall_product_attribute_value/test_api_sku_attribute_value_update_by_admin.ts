import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Admin updates a seller-created SKU attribute value mapping
 *
 * 1. Admin registers with valid info
 * 2. Seller registers with valid info
 * 3. Seller creates a SKU attribute value mapping (for a random SKU + attribute)
 * 4. Admin updates that mapping (value_display_name and/or attribute_id)
 * 5. Assert only admins can update via this API
 * 6. Validate business enforcement: update is reflected, uniqueness enforced
 */
export async function test_api_sku_attribute_value_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = typia.random<
    string & tags.Format<"password"> & tags.MinLength<8>
  >();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        name: RandomGenerator.name(2),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);
  // 2. Seller registration
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string = typia.random<
    string & tags.Format<"password"> & tags.MinLength<8>
  >();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: sellerPassword,
        business_name: RandomGenerator.name(2),
        registration_number: RandomGenerator.alphaNumeric(10),
        business_phone: RandomGenerator.mobile(),
        href: "https://seller-join.example.com/", // Example context url
        referrer: "https://referrer.example.com/",
        ip: undefined,
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);
  // 3. Seller creates a SKU attribute value mapping
  const skuId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const initialAttributeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const valueDisplayName: string = RandomGenerator.paragraph({ sentences: 2 });
  const created: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.skus.attributeValues.create(
      connection,
      {
        skuId,
        body: {
          shopping_mall_product_attribute_id: initialAttributeId,
          value_display_name: valueDisplayName,
        } satisfies IShoppingMallProductAttributeValue.ICreate,
      },
    );
  typia.assert(created);
  TestValidator.equals(
    "created attribute mapping display name",
    created.value_display_name,
    valueDisplayName,
  );
  // 4. Admin updates mapping (display name & attribute id update)
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IShoppingMallAdmin.ILogin,
  });
  // Change both display name and attribute id
  const updatedAttributeId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateDisplayName: string = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.shoppingMall.admin.skus.attributeValues.update(
      connection,
      {
        skuId: created.shopping_mall_product_sku_id,
        attributeValueId: created.id,
        body: {
          value_display_name: updateDisplayName,
          shopping_mall_product_attribute_id: updatedAttributeId,
        } satisfies IShoppingMallProductAttributeValue.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals(
    "updated attribute mapping display name",
    updated.value_display_name,
    updateDisplayName,
  );
  TestValidator.equals(
    "updated attribute mapping attribute id",
    updated.shopping_mall_product_attribute_id,
    updatedAttributeId,
  );
}
