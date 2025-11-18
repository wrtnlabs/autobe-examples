import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductCategory";
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
 * Verify seller-facing category listing is scoped to the seller's own products.
 *
 * Business goal: Ensure that the seller endpoint PATCH
 * /shoppingMall/seller/products/{productId}/categories
 * (api.functional.shoppingMall.seller.products.categories.index) does not leak
 * category associations of products owned by other sellers, while still
 * allowing sellers to view category associations for their own products.
 *
 * Scenario overview:
 *
 * 1. Provision an admin account and create at least one active category.
 * 2. Provision Seller A and create Product A.
 * 3. As admin, link Product A to the created category.
 * 4. Provision Seller B and create Product B.
 * 5. As admin, link Product B to a category.
 * 6. As Seller B, attempt to list categories for Product A (not owned).
 *
 *    - If the backend denies access with an error, this is acceptable.
 *    - If the backend allows the call, it must return an empty list so that no
 *         category data for Product A is observable by Seller B.
 * 7. As Seller B, list categories for Product B (owned) and assert that the
 *    category we linked is visible.
 */
export async function test_api_seller_product_categories_limited_to_own_product(
  connection: api.IConnection,
) {
  // 1. Admin join (provision an admin account & establish auth context)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/landing",
    } satisfies IShoppingMallAdminJoin.ICreate,
  });
  typia.assert(adminJoin);

  // 2. Create a category as admin
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        parent_id: null,
        slug: RandomGenerator.alphaNumeric(12),
        name_en: RandomGenerator.paragraph({ sentences: 2 }),
        description_en: RandomGenerator.paragraph({ sentences: 4 }),
        status: "active",
        sort_order: 1 as number & tags.Type<"int32">,
        is_leaf: true,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // 3. Seller A join and Product A creation
  const sellerAEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerAPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerAJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerAEmail,
      password: sellerAPassword,
      ip: null,
      href: "https://seller.example.com/join-a",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert(sellerAJoin);

  const productA = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        model_name: RandomGenerator.alphaNumeric(6),
        status: "active",
        primary_image_uri: "https://cdn.example.com/product-a.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productA);

  // 4. Admin login and link Product A to category
  const adminLogin = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert(adminLogin);

  const productCategoryA =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategoryA);

  // 5. Seller B join and Product B creation
  const sellerBEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerBPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerBJoin = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      ip: null,
      href: "https://seller.example.com/join-b",
      referrer: "https://seller.example.com/landing",
    } satisfies IShoppingMallSellerAuthJoin.IRequest,
  });
  typia.assert(sellerBJoin);

  const productB = await api.functional.shoppingMall.seller.products.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(8),
        title: RandomGenerator.paragraph({ sentences: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        brand: RandomGenerator.name(1),
        model_name: RandomGenerator.alphaNumeric(6),
        status: "active",
        primary_image_uri: "https://cdn.example.com/product-b.jpg" as string &
          tags.Format<"uri">,
        default_locale: "en-US",
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(productB);

  // 6. Admin login and link Product B to the category
  const adminLoginAgain = await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      ip: null,
      href: "https://admin.example.com/login-2",
      referrer: "https://admin.example.com/dashboard",
    } satisfies IShoppingMallAdminLogin.ICreate,
  });
  typia.assert(adminLoginAgain);

  const productCategoryB =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productB.id,
        body: {
          shopping_mall_category_id: category.id,
          is_primary: true,
        } satisfies IShoppingMallProductCategory.ICreate,
      },
    );
  typia.assert(productCategoryB);

  // 7. Seller B attempts to list categories for Product A (not owned)
  const sellerBLogin = await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerBEmail,
      password: sellerBPassword,
      ip: null,
      href: "https://seller.example.com/login-b",
      referrer: "https://seller.example.com/dashboard",
    } satisfies IShoppingMallSellerAuthLogin.IRequest,
  });
  typia.assert(sellerBLogin);

  let unauthorizedPage: IPageIShoppingMallProductCategory.ISummary | null =
    null;

  try {
    unauthorizedPage =
      await api.functional.shoppingMall.seller.products.categories.index(
        connection,
        {
          productId: productA.id,
          body: {
            page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
            orderBy: undefined,
            orderDirection: undefined,
            categoryCodes: undefined,
            isPrimary: undefined,
          } satisfies IShoppingMallProductCategory.IRequest,
        },
      );
  } catch {
    // An error (for example, authorization failure) is an acceptable outcome
    // for this scenario. We simply treat it as "no data leaked".
    unauthorizedPage = null;
  }

  if (unauthorizedPage !== null) {
    typia.assert<IPageIShoppingMallProductCategory.ISummary>(unauthorizedPage);
    TestValidator.equals(
      "unauthorized seller should see no categories for foreign product",
      unauthorizedPage.data.length,
      0,
    );
  }

  // 8. Seller B lists categories for Product B (owned) and sees linked category
  const pageB =
    await api.functional.shoppingMall.seller.products.categories.index(
      connection,
      {
        productId: productB.id,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
          orderBy: undefined,
          orderDirection: undefined,
          categoryCodes: undefined,
          isPrimary: undefined,
        } satisfies IShoppingMallProductCategory.IRequest,
      },
    );
  typia.assert(pageB);

  TestValidator.predicate(
    "seller B should see at least one category for own product",
    pageB.data.length > 0,
  );

  const hasLinkedCategoryB = pageB.data.some(
    (summary) => summary.id === category.id,
  );

  TestValidator.predicate(
    "seller B's category listing should include the linked category",
    hasLinkedCategoryB,
  );
}
