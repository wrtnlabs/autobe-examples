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

/**
 * Validate that the admin product-category link detail endpoint enforces
 * admin-only access.
 *
 * Business goals:
 *
 * - Ensure unauthenticated clients cannot read product-category link details.
 * - Ensure authenticated sellers (non-admins) cannot read admin-only
 *   product-category links.
 * - Ensure authenticated admins can retrieve the link and its data matches what
 *   was created.
 *
 * Scenario steps:
 *
 * 1. Register an admin via /auth/admin/join and obtain an admin token.
 * 2. Create a category as admin via /shoppingMall/admin/categories.
 * 3. Register a seller via /auth/seller/join and obtain seller token.
 * 4. As seller, create a product via /shoppingMall/seller/products.
 * 5. As admin, create a product-category link for that product via
 *    /shoppingMall/admin/products/{productId}/categories and capture the link
 *    id.
 * 6. Attempt to GET the link without any Authorization header and verify that an
 *    error is thrown.
 * 7. Attempt to GET the link as a seller (non-admin) and verify that an error is
 *    thrown.
 * 8. Finally, GET the link as admin and verify that it succeeds and returns the
 *    expected data.
 */
export async function test_api_admin_product_category_link_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Admin join (auto-logs in and sets Authorization header)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminJoinOutput);

  // 2. Create a category as admin
  const categoryBody = {
    parent_id: null,
    slug: RandomGenerator.alphabets(10),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 5 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert<IShoppingMallCategory>(category);

  // 3. Register a seller via /auth/seller/join
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerJoinOutput);

  // 4. As seller, create a product
  const productBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: typia.random<string & tags.Format<"uri">>(),
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert<IShoppingMallProduct>(product);

  // 5. Switch back to admin via login to ensure admin token active
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginOutput);

  // 6. As admin, create a product-category link for that product
  const linkBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkBody,
      },
    );
  typia.assert<IShoppingMallProductCategory>(link);

  // Helper for unauthenticated connection: clone connection with empty headers and do not touch them afterwards
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 7. Unauthenticated access should fail
  await TestValidator.error(
    "unauthenticated access to product-category link should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.at(
        unauthenticatedConnection,
        {
          productId: product.id,
          productCategoryLinkId: link.id,
        },
      );
    },
  );

  // 8. Seller (non-admin) access should also fail
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(sellerLoginOutput);

  await TestValidator.error(
    "seller access to admin product-category link should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.at(
        connection,
        {
          productId: product.id,
          productCategoryLinkId: link.id,
        },
      );
    },
  );

  // 9. Admin access should succeed and return matching link
  const adminLoginAgainBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginAgainOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginAgainBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminLoginAgainOutput);

  const fetched: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.at(connection, {
      productId: product.id,
      productCategoryLinkId: link.id,
    });
  typia.assert<IShoppingMallProductCategory>(fetched);

  TestValidator.equals(
    "fetched link id should match created link id",
    fetched.id,
    link.id,
  );
  TestValidator.equals(
    "fetched product id should match product.id",
    fetched.shopping_mall_product_id,
    link.shopping_mall_product_id,
  );
  TestValidator.equals(
    "fetched category id should match shopping_mall_category_id",
    fetched.shopping_mall_category_id,
    link.shopping_mall_category_id,
  );
  TestValidator.equals(
    "fetched is_primary should match created is_primary",
    fetched.is_primary,
    link.is_primary,
  );
}
