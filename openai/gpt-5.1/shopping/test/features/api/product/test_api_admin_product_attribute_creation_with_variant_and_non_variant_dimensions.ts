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
 * Validate admin creation of both variant-dimension and non-variant-dimension
 * product attributes for the same product.
 *
 * This test walks through a realistic cross-actor workflow:
 *
 * - A seller self-registers and creates a product in their catalog.
 * - An admin joins (with automatic authentication) and uses the admin-facing
 *   attribute creation API to configure two attributes on that product: one
 *   that participates in SKU variant uniqueness (e.g. color) and one that is
 *   informational only (e.g. material).
 *
 * Steps:
 *
 * 1. Seller joins via /auth/seller/join with a realistic email/password and
 *    href/referrer values. The SDK attaches the seller access token to the
 *    connection automatically.
 * 2. As the authenticated seller, create a product with
 *    api.functional.shoppingMall.seller.products.create, using a realistic
 *    IShoppingMallProduct.ICreate payload (code, title, summary, description,
 *    optional brand/model_name, status, primary_image_uri, default_locale).
 * 3. Admin joins via /auth/admin/join with its own credentials. This join call
 *    also authenticates the admin and updates the connection Authorization
 *    header.
 * 4. As admin, create a variant-dimension attribute on the product by calling
 *    api.functional.shoppingMall.admin.products.attributes.create with
 *    IShoppingMallProductAttribute.ICreate:
 *
 *    - Name = "color"
 *    - Display_name = "Color"
 *    - Data_type = "string"
 *    - Is_variant_dimension = true
 *    - Display_order = 1 Assert that:
 *    - The response is a valid IShoppingMallProductAttribute
 *    - Name/display_name/data_type match the request
 *    - Is_variant_dimension is true
 *    - Display_order is 1
 *    - Product.id in the embedded product summary equals the created product.id
 * 5. Still as admin, create a non-variant attribute for the same product, with
 *    IShoppingMallProductAttribute.ICreate:
 *
 *    - Name = "material"
 *    - Display_name = "Material"
 *    - Data_type = "string"
 *    - Is_variant_dimension = false
 *    - Display_order = 2 Perform the same shape and field equality assertions,
 *         especially that is_variant_dimension is false and display_order is
 *         2.
 * 6. Perform cross-attribute business rule checks in-memory using TestValidator:
 *
 *    - Both attributes reference the same product id.
 *    - The two attributes differ in is_variant_dimension (one true, one false),
 *         proving that variant and non-variant attributes can coexist on the
 *         same product.
 *    - The display_order values are 1 and 2 respectively so that a UI could render
 *         them in order.
 *
 * No attribute listing/search endpoint is called here because those behaviors
 * are validated in separate tests; this scenario focuses purely on creation
 * semantics and persistence of flags for mixed attribute types on a single
 * product.
 */
export async function test_api_admin_product_attribute_creation_with_variant_and_non_variant_dimensions(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Seller123!",
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized = await api.functional.auth.seller.join(connection, {
    body: sellerJoinBody,
  });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: "AutoBE Test Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(5),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(8) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: productCreateBody,
    },
  );
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins (auth context switches to admin)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Admin123!",
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates variant-dimension attribute (color)
  const colorAttributeBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 1,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const colorAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: colorAttributeBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(colorAttribute);

  // Field-level validations for color attribute
  TestValidator.equals(
    "color attribute: name matches",
    colorAttribute.name,
    colorAttributeBody.name,
  );
  TestValidator.equals(
    "color attribute: display_name matches",
    colorAttribute.display_name,
    colorAttributeBody.display_name,
  );
  TestValidator.equals(
    "color attribute: data_type matches",
    colorAttribute.data_type,
    colorAttributeBody.data_type,
  );
  TestValidator.equals(
    "color attribute: is_variant_dimension true",
    colorAttribute.is_variant_dimension,
    colorAttributeBody.is_variant_dimension,
  );
  TestValidator.equals(
    "color attribute: display_order 1",
    colorAttribute.display_order,
    colorAttributeBody.display_order,
  );
  TestValidator.equals(
    "color attribute: product id matches",
    colorAttribute.product.id,
    product.id,
  );

  // 5. Admin creates non-variant attribute (material)
  const materialAttributeBody = {
    name: "material",
    display_name: "Material",
    data_type: "string",
    is_variant_dimension: false,
    display_order: 2,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const materialAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: materialAttributeBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(materialAttribute);

  // Field-level validations for material attribute
  TestValidator.equals(
    "material attribute: name matches",
    materialAttribute.name,
    materialAttributeBody.name,
  );
  TestValidator.equals(
    "material attribute: display_name matches",
    materialAttribute.display_name,
    materialAttributeBody.display_name,
  );
  TestValidator.equals(
    "material attribute: data_type matches",
    materialAttribute.data_type,
    materialAttributeBody.data_type,
  );
  TestValidator.equals(
    "material attribute: is_variant_dimension false",
    materialAttribute.is_variant_dimension,
    materialAttributeBody.is_variant_dimension,
  );
  TestValidator.equals(
    "material attribute: display_order 2",
    materialAttribute.display_order,
    materialAttributeBody.display_order,
  );
  TestValidator.equals(
    "material attribute: product id matches",
    materialAttribute.product.id,
    product.id,
  );

  // 6. Cross-attribute business rule checks
  TestValidator.equals(
    "both attributes belong to same product",
    colorAttribute.product.id,
    materialAttribute.product.id,
  );

  TestValidator.predicate(
    "variant and non-variant flags differ",
    colorAttribute.is_variant_dimension !==
      materialAttribute.is_variant_dimension,
  );

  TestValidator.equals(
    "display_order of color attribute is 1",
    colorAttribute.display_order,
    1,
  );
  TestValidator.equals(
    "display_order of material attribute is 2",
    materialAttribute.display_order,
    2,
  );
}
