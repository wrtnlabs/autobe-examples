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
 * Validate that an admin can create a secondary (non-primary) category link for
 * a product when a primary link already exists.
 *
 * Business flow:
 *
 * 1. Admin joins (and becomes authenticated) via /auth/admin/join.
 * 2. Seller joins (and becomes authenticated) via /auth/seller/join.
 * 3. As seller, create a product via /shoppingMall/seller/products.
 * 4. Switch back to admin by logging in via /auth/admin/login.
 * 5. As admin, create two categories (categoryA and categoryB).
 * 6. As admin, create a primary product–category link for categoryA with
 *    is_primary=true.
 * 7. As admin, create a secondary link for categoryB with is_primary=false.
 * 8. Assert the secondary link is tied to the correct product and category and
 *    that is_primary is false.
 */
export async function test_api_admin_product_category_link_creation_with_non_primary_flag(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoin);

  // 2. Seller joins
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoin);

  // 3. As seller, create a product
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
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
  typia.assert(product);

  // 4. Switch back to admin via login to ensure admin token is active
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: typia.random<string & (tags.Format<"ipv4"> | tags.Format<"ipv6">)>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogin);

  // 5. As admin, create two categories
  const categoryABody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryABody,
    });
  typia.assert(categoryA);

  const categoryBBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(10),
    name_en: RandomGenerator.paragraph({ sentences: 1 }),
    description_en: RandomGenerator.paragraph({ sentences: 3 }),
    status: "active",
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBBody,
    });
  typia.assert(categoryB);

  // 6. Create primary product–category link for categoryA
  const primaryLinkBody = {
    shopping_mall_category_id: categoryA.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const primaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: primaryLinkBody,
      },
    );
  typia.assert(primaryLink);
  TestValidator.equals(
    "primary link should be marked as primary",
    primaryLink.is_primary,
    true,
  );

  // 7. Create secondary (non-primary) link for categoryB
  const secondaryLinkBody = {
    shopping_mall_category_id: categoryB.id,
    is_primary: false,
  } satisfies IShoppingMallProductCategory.ICreate;

  const secondaryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: secondaryLinkBody,
      },
    );
  typia.assert(secondaryLink);

  // 8. Assertions on the secondary link
  TestValidator.equals(
    "secondary link product id should match created product",
    secondaryLink.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "secondary link category id should match categoryB",
    secondaryLink.shopping_mall_category_id,
    categoryB.id,
  );
  TestValidator.equals(
    "secondary link should not be primary",
    secondaryLink.is_primary,
    false,
  );
}
