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
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

export async function test_api_admin_product_category_link_update_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Create admin via join to get an authenticated admin context
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create seller via join
  const sellerEmail: string = typia.random<string & tags.Format<"email">>();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: undefined,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Login as seller (ensures seller context using explicit login)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginAuthorized);

  // 4. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.shoppingmall.local/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Switch back to admin context (login as admin)
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: undefined,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginAuthorized);

  // 6. As admin, create a category
  const sortOrder: number & tags.Type<"int32"> = typia.random<
    number & tags.Type<"int32">
  >();

  const categoryCreateBody = {
    parent_id: null,
    slug: "category-" + RandomGenerator.alphaNumeric(8),
    name_en: "Category " + RandomGenerator.alphabets(5),
    description_en:
      "Test category for product-category link update authorization test.",
    status: "active",
    sort_order: sortOrder,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 7. As admin, create a product-category link for the product
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert(productCategoryLink);

  // 8. Prepare an unauthenticated connection (no Authorization header)
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 9. Attempt unauthorized update: should fail
  const updateBodyUnauthorized = {
    is_primary: false,
  } satisfies IShoppingMallProductCategory.IUpdate;

  await TestValidator.error(
    "unauthenticated admin product-category link update must fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.update(
        unauthenticatedConnection,
        {
          productId: product.id,
          productCategoryLinkId: productCategoryLink.id,
          body: updateBodyUnauthorized,
        },
      );
    },
  );

  // 10. Authenticated update as admin: should succeed
  const updateBodyAuthorized = {
    is_primary: false,
  } satisfies IShoppingMallProductCategory.IUpdate;

  const updatedLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.update(
      connection,
      {
        productId: product.id,
        productCategoryLinkId: productCategoryLink.id,
        body: updateBodyAuthorized,
      },
    );
  typia.assert(updatedLink);

  // 11. Validate that only is_primary changed, while product/category linkage remains intact
  TestValidator.equals(
    "product id on updated link must remain the same",
    updatedLink.shopping_mall_product_id,
    productCategoryLink.shopping_mall_product_id,
  );
  TestValidator.equals(
    "category id on updated link must remain the same",
    updatedLink.shopping_mall_category_id,
    productCategoryLink.shopping_mall_category_id,
  );
  TestValidator.equals(
    "is_primary flag must be updated to false",
    updatedLink.is_primary,
    false,
  );
}
