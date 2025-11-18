import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Ensure seller attribute update enforces unique (productId, name) pairs.
 *
 * Business purpose: This test validates that product attribute updates
 * performed by a seller cannot violate the uniqueness constraint on
 * (shopping_mall_product_id, name). For a given product, each attribute name
 * must be unique. While admins can define attributes, sellers are allowed to
 * update them through the seller attribute update API. The system must reject
 * attempts to rename an attribute to a name already used by another attribute
 * of the same product, while allowing renames to new unique names and other
 * updates to proceed.
 *
 * Scenario:
 *
 * 1. Register a seller and obtain an authenticated seller session.
 * 2. As the seller, create a product using the seller product creation API.
 * 3. Register an admin and obtain an authenticated admin session.
 * 4. As the admin, create two attributes A and B ("color" and "size") for the
 *    product using the admin attribute creation API.
 * 5. Switch back to the seller account via login.
 * 6. Attempt to update attribute B via the seller attribute update API, trying to
 *    rename it to "color" (which is already used by attribute A). This must
 *    fail with a business error (enforced via TestValidator.error).
 * 7. Perform a valid update on attribute B by renaming it to a new unique name
 *    (e.g., "size_label") and adjusting other mutable fields. This must
 *    succeed, and the updated attribute must reflect the new values.
 *
 * Assertions:
 *
 * - The duplicate-name update attempt results in an error (without checking
 *   specific HTTP status codes), indicating uniqueness enforcement.
 * - The successful update preserves the attribute id and updates the name and
 *   other fields as requested.
 */
export async function test_api_seller_product_attribute_update_enforces_unique_name_per_product(
  connection: api.IConnection,
) {
  // 1. Seller join (registration) to obtain seller identity and token
  const sellerJoinBody = typia.random<IShoppingMallSellerAuthJoin.IRequest>();
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // Capture seller credentials for later login
  const sellerEmail = sellerJoinBody.email;
  const sellerPassword = sellerJoinBody.password;

  // 2. Seller creates a product
  const productCreateBody = typia.random<IShoppingMallProduct.ICreate>();
  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin join
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // Capture admin credentials for explicit login
  const adminEmail = adminJoinBody.email;
  const adminPassword = adminJoinBody.password;

  // 4. Admin login to ensure admin context
  const adminLoginBody: IShoppingMallAdminLogin.ICreate = {
    email: adminEmail,
    password: adminPassword,
    ip: adminJoinBody.ip ?? null,
    href: adminJoinBody.href,
    referrer: adminJoinBody.referrer,
  };
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoggedIn);

  // 5. Admin creates Attribute A ("color") and Attribute B ("size")
  const attributeAName = "color";
  const attributeBName = "size";

  const attributeACreateBody = {
    name: attributeAName,
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attributeA: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeACreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attributeA);

  const attributeBCreateBody = {
    name: attributeBName,
    display_name: "Size",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attributeB: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeBCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attributeB);

  const attributeBId = attributeB.id;

  // 6. Switch back to seller account via login
  const sellerLoginBody: IShoppingMallSellerAuthLogin.IRequest = {
    email: sellerEmail,
    password: sellerPassword,
    ip: sellerJoinBody.ip ?? null,
    href: sellerJoinBody.href,
    referrer: sellerJoinBody.referrer,
  };
  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoggedIn);

  // 7. Negative case: attempt to rename attribute B to existing name "color"
  await TestValidator.error(
    "seller cannot rename attribute to duplicate name within same product",
    async () => {
      const duplicateNameUpdateBody = {
        name: attributeAName,
      } satisfies IShoppingMallProductAttribute.IUpdate;

      await api.functional.shoppingMall.seller.products.attributes.update(
        connection,
        {
          productId: product.id,
          productAttributeId: attributeBId,
          body: duplicateNameUpdateBody,
        },
      );
    },
  );

  // 8. Positive case: rename attribute B to unique "size_label" and update other fields
  const newAttributeBName = "size_label";
  const newAttributeBDisplayName = "Size Label";
  const newAttributeBDisplayOrder = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();

  const validUpdateBody = {
    name: newAttributeBName,
    display_name: newAttributeBDisplayName,
    display_order: newAttributeBDisplayOrder,
  } satisfies IShoppingMallProductAttribute.IUpdate;

  const updatedAttributeB: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        productAttributeId: attributeBId,
        body: validUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(updatedAttributeB);

  // 9. Sanity assertions on updated attribute B
  TestValidator.equals(
    "updated attribute B keeps same id",
    updatedAttributeB.id,
    attributeBId,
  );

  TestValidator.equals(
    "updated attribute B name is changed to unique value",
    updatedAttributeB.name,
    newAttributeBName,
  );

  TestValidator.equals(
    "updated attribute B display_name matches request",
    updatedAttributeB.display_name,
    newAttributeBDisplayName,
  );

  TestValidator.equals(
    "updated attribute B display_order matches request",
    updatedAttributeB.display_order,
    newAttributeBDisplayOrder,
  );
}
