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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Basic admin product attribute detail retrieval flow.
 *
 * This E2E scenario verifies that an authenticated admin can retrieve the
 * detailed information of a specific product attribute for a given product. It
 * exercises the end-to-end lifecycle required for such an operation:
 *
 * 1. A seller joins and logs in to obtain a seller session.
 * 2. Using the seller context, the seller creates a product via POST
 *    /shoppingMall/seller/products.
 * 3. An admin account is created and logged in to obtain an admin session.
 * 4. The admin creates a global catalog category via POST
 *    /shoppingMall/admin/categories.
 * 5. The admin links the previously created product to that category via POST
 *    /shoppingMall/admin/products/{productId}/categories.
 * 6. The admin creates a product attribute for that product via POST
 *    /shoppingMall/admin/products/{productId}/attributes.
 * 7. Finally, the admin calls GET
 *    /shoppingMall/admin/products/{productId}/attributes/{productAttributeId}
 *    to retrieve the attribute detail.
 *
 * The test then validates that:
 *
 * - The returned attribute ID matches the one created in step 6.
 * - The embedded product summary has an ID equal to the created product ID.
 * - Attribute fields (name, display_name, data_type, is_variant_dimension,
 *   display_order) match the creation payload.
 * - Created_at and updated_at are populated, and deleted_at is null.
 * - The foreign key relationship between attribute and product is enforced by
 *   checking that the attribute belongs to the created product rather than any
 *   other product.
 */
export async function test_api_admin_product_attribute_detail_basic_flow(
  connection: api.IConnection,
) {
  // 1. Seller joins the platform
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller logs in explicitly (to reflect scenario; token is handled by SDK)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 4. Admin joins the platform
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Admin logs in (session/headers handled by SDK)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);

  // 6. Admin creates a global category
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 7. Admin associates product with the category
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

  // 8. Admin creates a product attribute for the product
  const attributeCreateBody = {
    name: RandomGenerator.alphabets(8) as string,
    display_name: RandomGenerator.paragraph({ sentences: 1 }),
    data_type: "string",
    is_variant_dimension: true,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies IShoppingMallProductAttribute.ICreate;

  const createdAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: product.id,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(createdAttribute);

  // Basic consistency checks on created attribute
  TestValidator.equals(
    "created attribute belongs to product (id)",
    createdAttribute.product.id,
    product.id,
  );
  TestValidator.equals(
    "created attribute name matches request",
    createdAttribute.name,
    attributeCreateBody.name,
  );
  TestValidator.equals(
    "created attribute display_name matches request",
    createdAttribute.display_name,
    attributeCreateBody.display_name,
  );
  TestValidator.equals(
    "created attribute data_type matches request",
    createdAttribute.data_type,
    attributeCreateBody.data_type,
  );
  TestValidator.equals(
    "created attribute is_variant_dimension matches request",
    createdAttribute.is_variant_dimension,
    attributeCreateBody.is_variant_dimension,
  );
  TestValidator.equals(
    "created attribute display_order matches request",
    createdAttribute.display_order,
    attributeCreateBody.display_order,
  );

  TestValidator.predicate(
    "created attribute created_at is populated",
    createdAttribute.created_at.length > 0,
  );
  TestValidator.predicate(
    "created attribute updated_at is populated",
    createdAttribute.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created attribute deleted_at is null",
    createdAttribute.deleted_at === null,
  );

  // 9. Admin retrieves attribute detail using GET endpoint
  const fetchedAttribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.at(connection, {
      productId: product.id,
      productAttributeId: createdAttribute.id,
    });
  typia.assert<IShoppingMallProductAttribute>(fetchedAttribute);

  // 10. Validate that fetched attribute matches created attribute and linkage
  TestValidator.equals(
    "fetched attribute id equals created attribute id",
    fetchedAttribute.id,
    createdAttribute.id,
  );

  TestValidator.equals(
    "fetched attribute product.id equals original product id",
    fetchedAttribute.product.id,
    product.id,
  );

  TestValidator.equals(
    "fetched attribute name matches created name",
    fetchedAttribute.name,
    attributeCreateBody.name,
  );
  TestValidator.equals(
    "fetched attribute display_name matches created display_name",
    fetchedAttribute.display_name,
    attributeCreateBody.display_name,
  );
  TestValidator.equals(
    "fetched attribute data_type matches created data_type",
    fetchedAttribute.data_type,
    attributeCreateBody.data_type,
  );
  TestValidator.equals(
    "fetched attribute is_variant_dimension matches created flag",
    fetchedAttribute.is_variant_dimension,
    attributeCreateBody.is_variant_dimension,
  );
  TestValidator.equals(
    "fetched attribute display_order matches created display_order",
    fetchedAttribute.display_order,
    attributeCreateBody.display_order,
  );

  TestValidator.predicate(
    "fetched attribute created_at is populated",
    fetchedAttribute.created_at.length > 0,
  );
  TestValidator.predicate(
    "fetched attribute updated_at is populated",
    fetchedAttribute.updated_at.length > 0,
  );
  TestValidator.predicate(
    "fetched attribute deleted_at is null",
    fetchedAttribute.deleted_at === null,
  );

  // 11. Confirm foreign key relationship is enforced by verifying
  // that the product summary in the attribute corresponds to the
  // created product (at least by id; other summary fields are
  // validated structurally via typia.assert).
  TestValidator.equals(
    "attribute's product summary id matches product id",
    fetchedAttribute.product.id,
    product.id,
  );
}
