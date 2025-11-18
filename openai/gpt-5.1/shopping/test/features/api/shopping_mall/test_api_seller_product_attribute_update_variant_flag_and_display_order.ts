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
 * Validate that a seller can update variant flag and display order of a product
 * attribute.
 *
 * Business flow:
 *
 * 1. Register a seller and implicitly authenticate.
 * 2. The seller creates a product.
 * 3. Register an admin and authenticate as admin.
 * 4. Admin creates an attribute for the seller's product (material, not variant,
 *    order 5).
 * 5. Switch back to seller by logging in as the seller.
 * 6. Seller updates the attribute to toggle `is_variant_dimension` to true and
 *    change `display_order` to 1.
 * 7. Assert that only those two fields changed and others stayed the same.
 * 8. Perform a second update toggling `is_variant_dimension` back to false and
 *    `display_order` to 2, asserting stability and repeatability.
 */
export async function test_api_seller_product_attribute_update_variant_flag_and_display_order(
  connection: api.IConnection,
) {
  // 1. Seller registration (join) - creates seller and authenticates
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinRequest = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoin);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin registration (join) - creates admin and authenticates
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinRequest = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinRequest,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoin);

  // 4. Admin creates initial attribute for the product
  const attributeCreateBody = {
    name: "material",
    display_name: "Material",
    data_type: "string",
    is_variant_dimension: false,
    display_order: 5,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const initialAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(initialAttribute);

  // 5. Switch back to seller by logging in
  const sellerLoginRequest = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginRequest,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 6. Seller updates attribute: toggle is_variant_dimension to true, display_order to 1
  const firstUpdateBody = {
    is_variant_dimension: true,
    display_order: 1,
  } satisfies IShoppingMallProductAttribute.IUpdate;

  const updated1: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        productAttributeId: initialAttribute.id,
        body: firstUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(updated1);

  // 7. Assertions after first update
  TestValidator.equals(
    "attribute id should remain the same after first update",
    updated1.id,
    initialAttribute.id,
  );
  TestValidator.equals(
    "attribute product id should remain the same after first update",
    updated1.product.id,
    initialAttribute.product.id,
  );
  TestValidator.equals(
    "attribute name should remain unchanged after first update",
    updated1.name,
    initialAttribute.name,
  );
  TestValidator.equals(
    "attribute display_name should remain unchanged after first update",
    updated1.display_name,
    initialAttribute.display_name,
  );
  TestValidator.equals(
    "attribute data_type should remain unchanged after first update",
    updated1.data_type,
    initialAttribute.data_type,
  );
  TestValidator.equals(
    "attribute is_variant_dimension should be true after first update",
    updated1.is_variant_dimension,
    true,
  );
  TestValidator.equals(
    "attribute display_order should be 1 after first update",
    updated1.display_order,
    1,
  );

  // 8. Second update: toggle is_variant_dimension back to false and display_order to 2
  const secondUpdateBody = {
    is_variant_dimension: false,
    display_order: 2,
  } satisfies IShoppingMallProductAttribute.IUpdate;

  const updated2: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.seller.products.attributes.update(
      connection,
      {
        productId: product.id,
        productAttributeId: initialAttribute.id,
        body: secondUpdateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(updated2);

  // Assertions after second update
  TestValidator.equals(
    "attribute id should remain the same after second update",
    updated2.id,
    updated1.id,
  );
  TestValidator.equals(
    "attribute product id should remain the same after second update",
    updated2.product.id,
    updated1.product.id,
  );
  TestValidator.equals(
    "attribute name should remain unchanged after second update",
    updated2.name,
    updated1.name,
  );
  TestValidator.equals(
    "attribute display_name should remain unchanged after second update",
    updated2.display_name,
    updated1.display_name,
  );
  TestValidator.equals(
    "attribute data_type should remain unchanged after second update",
    updated2.data_type,
    updated1.data_type,
  );
  TestValidator.equals(
    "attribute is_variant_dimension should be false after second update",
    updated2.is_variant_dimension,
    false,
  );
  TestValidator.equals(
    "attribute display_order should be 2 after second update",
    updated2.display_order,
    2,
  );
}
