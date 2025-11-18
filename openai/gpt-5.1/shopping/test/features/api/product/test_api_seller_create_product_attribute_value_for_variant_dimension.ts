import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttribute";
import type { IShoppingMallProductAttributeValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductAttributeValue";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate seller-side creation of a product attribute value under a
 * variant-capable attribute.
 *
 * Business workflow:
 *
 * 1. A seller joins the platform and becomes authenticated.
 * 2. The seller creates a new product that will later receive variant attributes.
 * 3. An admin joins and becomes authenticated to manage global/catalog
 *    configuration.
 * 4. The admin creates a category and links the product into that category to
 *    emulate realistic catalog setup.
 * 5. The admin defines a product attribute with is_variant_dimension=true for that
 *    product.
 * 6. The seller logs in again (switching auth context back to seller) and creates
 *    a concrete attribute value for the variant-capable attribute.
 *
 * Validations:
 *
 * - All non-void responses are structurally validated with typia.assert.
 * - The attribute value response is checked to ensure:
 *
 *   - Attribute.id matches the created attribute id.
 *   - Attribute.product.id matches the created product id.
 *   - Value, display_value, and display_order echo the request payload.
 *   - Attribute.is_variant_dimension is true, confirming we are under a variant
 *       dimension.
 *   - Created_at and updated_at are present and equal right after creation;
 *       deleted_at is null or undefined.
 */
export async function test_api_seller_create_product_attribute_value_for_variant_dimension(
  connection: api.IConnection,
) {
  // 1. Seller joins (registration + initial auth)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller creates a new product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri: "https://cdn.example.com/image.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins (registration + initial auth)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(14) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 4. Admin creates a category and links the product into that category
  const categoryCreateBody = {
    parent_id: null,
    slug: "apparel-" + RandomGenerator.alphaNumeric(6),
    name_en: "Apparel Category",
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);

  // 5. Admin creates a variant-capable product attribute for the product
  const attributeCreateBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 0 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  TestValidator.predicate(
    "attribute belongs to created product",
    attribute.product.id === product.id,
  );
  TestValidator.predicate(
    "attribute is variant dimension",
    attribute.is_variant_dimension === true,
  );

  // 6. Switch back to seller context using explicit login
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.example.com/login" as string & tags.Format<"uri">,
    referrer: "https://seller.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReAuth);

  // 7. Seller creates an attribute value for the variant-capable attribute
  const valueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1 as number & tags.Type<"int32">,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const attributeValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productAttributeId: attribute.id as string & tags.Format<"uuid">,
        body: valueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(attributeValue);

  // Core assertions on the attribute value wiring and echoing of payload
  TestValidator.equals(
    "attributeValue.attribute.id matches attribute.id",
    attributeValue.attribute.id,
    attribute.id,
  );
  TestValidator.equals(
    "attributeValue.attribute.product.id matches product.id",
    attributeValue.attribute.product.id,
    product.id,
  );
  TestValidator.equals(
    "attributeValue.value echoes request payload",
    attributeValue.value,
    valueCreateBody.value,
  );
  TestValidator.equals(
    "attributeValue.display_value echoes request payload",
    attributeValue.display_value,
    valueCreateBody.display_value,
  );
  TestValidator.equals(
    "attributeValue.display_order echoes request payload",
    attributeValue.display_order,
    valueCreateBody.display_order,
  );
  TestValidator.predicate(
    "attributeValue.attribute.is_variant_dimension is true",
    attributeValue.attribute.is_variant_dimension === true,
  );

  // created_at and updated_at should both be set and equal just after creation
  TestValidator.predicate(
    "created_at is non-empty string",
    typeof attributeValue.created_at === "string" &&
      attributeValue.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty string",
    typeof attributeValue.updated_at === "string" &&
      attributeValue.updated_at.length > 0,
  );
  TestValidator.equals(
    "created_at and updated_at are equal on initial creation",
    attributeValue.created_at,
    attributeValue.updated_at,
  );

  TestValidator.predicate(
    "deleted_at is null or undefined on creation",
    attributeValue.deleted_at === null ||
      attributeValue.deleted_at === undefined,
  );
}
