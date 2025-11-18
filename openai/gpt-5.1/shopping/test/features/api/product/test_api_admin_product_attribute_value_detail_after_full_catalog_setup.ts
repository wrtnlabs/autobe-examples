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
 * Verify admin can retrieve a specific product attribute value detail after a
 * complete, realistic catalog setup involving both seller and admin actors.
 *
 * Business flow:
 *
 * 1. Seller joins the platform and becomes authenticated.
 * 2. Seller creates a new product with realistic core fields.
 * 3. Admin joins (and authenticates) to manage catalog configuration.
 * 4. Admin creates an active leaf category.
 * 5. Admin links the seller's product to that category.
 * 6. Admin defines a variant-capable attribute (e.g., color) on that product.
 * 7. Seller creates a concrete attribute value (e.g., RED) for that attribute.
 * 8. Admin retrieves the attribute value detail using the admin endpoint.
 * 9. The response is validated structurally (typia.assert) and logically using
 *    TestValidator: IDs, linkage, and business fields must match.
 */
export async function test_api_admin_product_attribute_value_detail_after_full_catalog_setup(
  connection: api.IConnection,
) {
  // 1. Seller joins and becomes authenticated
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.Format<"password">>();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuth);

  // 2. Seller creates a new product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-001",
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 3. Admin joins and becomes authenticated
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuth);

  // 4. Admin creates a leaf category
  const categoryCreateBody = {
    parent_id: null,
    slug: "mens-tshirts",
    name_en: "Men's T-Shirts",
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 5. Admin links the product to the category
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

  // 6. Admin defines a variant-capable attribute on the product
  const attributeCreateBody = {
    name: "color",
    display_name: "Color",
    data_type: "string",
    is_variant_dimension: true,
    display_order: 0,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  // 7. Seller logs in again (explicitly) and creates a concrete attribute value
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginAuth);

  const attributeValueCreateBody = {
    value: "RED",
    display_value: "Red",
    display_order: 1,
  } satisfies IShoppingMallProductAttributeValue.ICreate;

  const createdValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.seller.products.attributes.values.create(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        body: attributeValueCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(createdValue);

  // 8. Admin logs in and retrieves the attribute value detail
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAuth);

  const readValue: IShoppingMallProductAttributeValue =
    await api.functional.shoppingMall.admin.products.attributes.values.at(
      connection,
      {
        productId: product.id,
        productAttributeId: attribute.id,
        productAttributeValueId: createdValue.id,
      },
    );
  typia.assert<IShoppingMallProductAttributeValue>(readValue);

  // 9. Business validations
  TestValidator.equals(
    "attribute value id should match created id",
    readValue.id,
    createdValue.id,
  );

  TestValidator.equals(
    "attribute summary id matches attribute id",
    readValue.attribute.id,
    attribute.id,
  );

  TestValidator.equals(
    "attribute summary product id matches product id",
    readValue.attribute.product.id,
    product.id,
  );

  TestValidator.equals(
    "value matches creation payload",
    readValue.value,
    attributeValueCreateBody.value,
  );

  TestValidator.equals(
    "display_value matches creation payload",
    readValue.display_value,
    attributeValueCreateBody.display_value,
  );

  TestValidator.equals(
    "display_order matches creation payload",
    readValue.display_order,
    attributeValueCreateBody.display_order,
  );

  TestValidator.predicate(
    "created_at should be a non-empty string",
    readValue.created_at.length > 0,
  );

  TestValidator.predicate(
    "updated_at should be a non-empty string",
    readValue.updated_at.length > 0,
  );

  TestValidator.equals(
    "deleted_at should be null for active attribute value",
    readValue.deleted_at,
    null,
  );
}
