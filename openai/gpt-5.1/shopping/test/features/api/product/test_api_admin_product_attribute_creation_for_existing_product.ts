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
 * Validate admin-scoped product attribute creation for an existing product.
 *
 * Business context:
 *
 * - A seller owns products and can register them via seller APIs.
 * - An admin manages global catalog configuration such as categories and product
 *   attribute definitions.
 * - Product attributes (like color, size) are defined per product and may be
 *   marked as variant dimensions used for SKU combinations.
 *
 * This test verifies that:
 *
 * 1. A seller can join and log in, then create a base product.
 * 2. An admin can join and log in to gain admin-scoped privileges.
 * 3. The admin can create a category and associate the product with it (realistic
 *    catalog setup, though not strictly required for attributes).
 * 4. The admin can create a product attribute for that product via POST
 *    /shoppingMall/admin/products/{productId}/attributes with a valid
 *    IShoppingMallProductAttribute.ICreate payload.
 * 5. The returned IShoppingMallProductAttribute mirrors the request fields where
 *    applicable and is tied to the correct product summary.
 * 6. A seller (non-admin) cannot call the admin attribute endpoint; attempting to
 *    do so should result in an error.
 */
export async function test_api_admin_product_attribute_creation_for_existing_product(
  connection: api.IConnection,
) {
  // 1. Seller joins
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller-portal.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://landing.example.com" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerAuthorized);

  // 2. Seller login (ensure login endpoint works and token is set)
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller-portal.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://landing.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLogin);
  TestValidator.equals(
    "seller login id matches join id",
    sellerLogin.id,
    sellerAuthorized.id,
  );

  // 3. Seller creates a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/product-main.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert<IShoppingMallProduct>(product);
  TestValidator.equals(
    "product code mirrors request",
    product.code,
    productCreateBody.code,
  );

  const productId: string & tags.Format<"uuid"> = product.id;

  // 4. Admin joins
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin-portal.example.com/join" as string &
      tags.Format<"uri">,
    referrer: "https://admin-landing.example.com" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 5. Admin login (explicitly switch context to admin)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin-portal.example.com/login" as string &
      tags.Format<"uri">,
    referrer: "https://admin-landing.example.com/login" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLogin);
  TestValidator.equals(
    "admin login id matches join id",
    adminLogin.id,
    adminAuthorized.id,
  );

  // 6. Create a category as admin (realistic catalog setup)
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
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
  TestValidator.equals(
    "category slug mirrors request",
    category.slug,
    categoryCreateBody.slug,
  );

  // 7. Link product to category
  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productId,
        body: productCategoryCreateBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(productCategory);
  TestValidator.equals(
    "product-category link refers to correct category",
    productCategory.shopping_mall_category_id,
    productCategoryCreateBody.shopping_mall_category_id,
  );

  // 8. Create product attribute as admin
  const attributeCreateBody = {
    name: "color" as string & tags.MinLength<1>,
    display_name: "Color" as string & tags.MinLength<1>,
    data_type: "string" as string & tags.MinLength<1>,
    is_variant_dimension: true,
    display_order: 1 as number & tags.Type<"int32"> & tags.Minimum<0>,
  } satisfies IShoppingMallProductAttribute.ICreate;

  const attribute: IShoppingMallProductAttribute =
    await api.functional.shoppingMall.admin.products.attributes.create(
      connection,
      {
        productId: productId,
        body: attributeCreateBody,
      },
    );
  typia.assert<IShoppingMallProductAttribute>(attribute);

  // 9. Validate attribute mirrors request and ties to correct product
  TestValidator.equals(
    "attribute name mirrors request",
    attribute.name,
    attributeCreateBody.name,
  );
  TestValidator.equals(
    "attribute display_name mirrors request",
    attribute.display_name,
    attributeCreateBody.display_name,
  );
  TestValidator.equals(
    "attribute data_type mirrors request",
    attribute.data_type,
    attributeCreateBody.data_type,
  );
  TestValidator.equals(
    "attribute is_variant_dimension mirrors request",
    attribute.is_variant_dimension,
    attributeCreateBody.is_variant_dimension,
  );
  TestValidator.equals(
    "attribute display_order mirrors request",
    attribute.display_order,
    attributeCreateBody.display_order,
  );
  TestValidator.equals(
    "attribute product id matches created product",
    attribute.product.id,
    productId,
  );

  // 10. Ensure seller cannot call admin attribute endpoint
  const sellerReLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerReLogin);

  await TestValidator.error(
    "seller cannot create admin product attribute",
    async () => {
      await api.functional.shoppingMall.admin.products.attributes.create(
        connection,
        {
          productId: productId,
          body: attributeCreateBody,
        },
      );
    },
  );
}
