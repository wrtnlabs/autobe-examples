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
 * Verify that admin product-category link detail endpoint hides soft-deleted
 * links.
 *
 * Business context: Admins manage how products are attached to categories via
 * the `shopping_mall_product_categories` junction table. A link can be created,
 * retrieved, and deleted. Deletion is implemented via a dedicated DELETE
 * endpoint and, from the perspective of admin read APIs, a soft-deleted link
 * should no longer be retrievable with the detail endpoint.
 *
 * This test exercises the lifecycle of a single link:
 *
 * 1. Create admin and authenticate.
 * 2. Create a category via the admin categories create endpoint.
 * 3. Create a seller and authenticate as seller.
 * 4. Create a product as that seller.
 * 5. Switch back to admin authentication.
 * 6. Create a product-category link for the product and category.
 * 7. Confirm the link can be fetched and is not soft-deleted.
 * 8. Delete the link using the admin erase endpoint.
 * 9. Confirm that fetching the link again fails with an error, representing
 *    not-found behavior for soft-deleted rows.
 */
export async function test_api_admin_product_category_link_respects_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Admin join (also authenticates as admin through SDK behavior)
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  // 2. Create a category as admin
  const categoryBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
    name_en: RandomGenerator.name(2),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1 as number & tags.Type<"int32">,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryBody,
    });
  typia.assert(category);

  // 3. Seller join (authenticate as seller)
  const sellerJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller.test`,
    password: "P@ssw0rd!",
    ip: null,
    href: "https://seller.shoppingmall.test/join",
    referrer: "https://seller.shoppingmall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuth: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuth);

  // 4. Create a product as this seller
  const productBody = {
    code: `PROD-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.name(3),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    brand: "TestBrand",
    model_name: "Model-X",
    status: "active",
    primary_image_uri: "https://cdn.shoppingmall.test/images/product.jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBody,
    });
  typia.assert(product);

  // 5. Switch back to admin authentication via login
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.test/login",
    referrer: "https://admin.shoppingmall.test/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // 6. Create a product-category link for the product and category
  const linkCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const link: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: linkCreateBody,
      },
    );
  typia.assert(link);

  // 7. Immediately fetch the link and verify it exists and not soft-deleted
  const fetchedBeforeDelete: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.at(connection, {
      productId: product.id,
      productCategoryLinkId: link.id,
    });
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched link before delete matches created link id",
    fetchedBeforeDelete.id,
    link.id,
  );
  TestValidator.equals(
    "fetched link before delete has same product id",
    fetchedBeforeDelete.shopping_mall_product_id,
    product.id,
  );
  TestValidator.equals(
    "fetched link before delete has same category id",
    fetchedBeforeDelete.shopping_mall_category_id,
    category.id,
  );
  TestValidator.equals(
    "link is not soft-deleted before erase",
    fetchedBeforeDelete.deleted_at ?? null,
    null,
  );

  // 8. Delete the link using admin erase endpoint
  await api.functional.shoppingMall.admin.products.categories.erase(
    connection,
    {
      productId: product.id,
      productCategoryLinkId: link.id,
    },
  );

  // 9. Verify that fetching again now fails with an error (not-found like behavior)
  await TestValidator.error(
    "soft-deleted product-category link should not be retrievable",
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
}
