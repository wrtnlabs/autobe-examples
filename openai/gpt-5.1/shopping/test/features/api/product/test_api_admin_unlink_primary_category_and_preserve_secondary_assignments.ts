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
 * Admin deletes a primary product-category link while preserving secondary
 * links.
 *
 * Business flow:
 *
 * 1. A seller joins and creates a product.
 * 2. An admin joins and creates two categories.
 * 3. The admin links the product to both categories, marking one as primary.
 * 4. The admin deletes the primary link using the erase endpoint.
 * 5. The test verifies that:
 *
 *    - Attempting to delete the same link again fails (it was actually removed).
 *    - The secondary link can still be deleted afterwards, proving it remained
 *         intact after the primary deletion and that deletion is scoped to a
 *         single link row.
 */
export async function test_api_admin_unlink_primary_category_and_preserve_secondary_assignments(
  connection: api.IConnection,
) {
  // 1. Seller joins and creates a product
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 1 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri:
      "https://cdn.example.com/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 2. Admin joins (switch actor to admin)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // Optionally login again as admin to exercise login path
  const adminLoginBody = {
    email: adminEmail,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Admin creates two categories
  const categoryABody = {
    parent_id: null,
    slug: `cat-a-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Category A",
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryA: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryABody,
    });
  typia.assert(categoryA);

  const categoryBBody = {
    parent_id: null,
    slug: `cat-b-${RandomGenerator.alphaNumeric(8)}`,
    name_en: "Category B",
    description_en: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    sort_order: 2 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const categoryB: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBBody,
    });
  typia.assert(categoryB);

  // 4. Admin links product to both categories, marking one as primary
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

  TestValidator.equals(
    "product id on primary link matches created product",
    primaryLink.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "product id on secondary link matches created product",
    secondaryLink.shopping_mall_product_id,
    product.id,
  );

  // 5. Delete the primary link
  await api.functional.shoppingMall.admin.products.categories.erase(
    connection,
    {
      productId: primaryLink.shopping_mall_product_id,
      productCategoryLinkId: primaryLink.id,
    },
  );

  // Verify that deleting the same link again fails (it is already gone)
  await TestValidator.error(
    "deleting an already removed primary link should fail",
    async () => {
      await api.functional.shoppingMall.admin.products.categories.erase(
        connection,
        {
          productId: primaryLink.shopping_mall_product_id,
          productCategoryLinkId: primaryLink.id,
        },
      );
    },
  );

  // Verify that the secondary link still exists by successfully deleting it
  await api.functional.shoppingMall.admin.products.categories.erase(
    connection,
    {
      productId: secondaryLink.shopping_mall_product_id,
      productCategoryLinkId: secondaryLink.id,
    },
  );
}
