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
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that product–tag links that are not active for a product are not
 * retrievable via the public read endpoint and effectively behave as not
 * found.
 *
 * Business context:
 *
 * - Product–tag associations are stored in `shopping_mall_product_tag_links`.
 * - The public read endpoint GET
 *   /shoppingMall/products/{productId}/tags/{productTagLinkId} should only
 *   expose active links that belong to the specified product.
 * - Identifiers referencing non-existing or historical (soft-deleted) links must
 *   not leak data via this endpoint.
 *
 * Due to the absence of a delete/soft-delete API and the prohibition on direct
 * DB access in E2E tests, this test reinterprets the soft-delete scenario as a
 * not-found case: using a random, unrelated link identifier for the given
 * product and verifying that the endpoint fails instead of returning data.
 *
 * Workflow implemented:
 *
 * 1. Admin joins and is authenticated.
 * 2. Seller joins and logs in.
 * 3. Admin creates a category and a product tag.
 * 4. Seller creates a product.
 * 5. Admin associates the product with the category.
 * 6. Seller creates a product–tag link for that product.
 * 7. Generate a random UUID that does NOT match the created link id.
 * 8. Call GET /shoppingMall/products/{productId}/tags/{productTagLinkId} with the
 *    random UUID and assert that an error is thrown, proving that non-existing
 *    (or conceptually soft-deleted) links are not retrievable via this
 *    endpoint.
 */
export async function test_api_product_tag_link_get_after_soft_delete_returns_not_found(
  connection: api.IConnection,
) {
  // 1. Admin joins (auto-authenticated)
  const adminEmail: string = `admin+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const adminPassword: string & tags.Format<"password"> =
    "AdminPassw0rd!" as string & tags.Format<"password">;

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shopping-mall.test/join",
    referrer: "https://admin.shopping-mall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seller joins and logs in
  const sellerEmail: string & tags.Format<"email"> =
    `${RandomGenerator.alphabets(8)}@seller.test` as string &
      tags.Format<"email">;

  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller.shopping-mall.test/join",
    referrer: "https://seller.shopping-mall.test/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorizedFromJoin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorizedFromJoin);

  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPassw0rd!",
    ip: null,
    href: "https://seller.shopping-mall.test/login",
    referrer: "https://seller.shopping-mall.test/login-form",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorized);

  // 3. Admin creates category and product tag
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.shopping-mall.test/login",
    referrer: "https://admin.shopping-mall.test/login-form",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorizedFromLogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedFromLogin);

  const categoryCreateBody = {
    parent_id: null,
    slug: `cat-${RandomGenerator.alphaNumeric(8)}`,
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
  typia.assert(category);

  const productTagCreateBody = {
    code: `tag-${RandomGenerator.alphaNumeric(10)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: productTagCreateBody,
    });
  typia.assert(productTag);

  // 4. Seller creates product
  const sellerAuthorizedAgain: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedAgain);

  const productCreateBody = {
    code: `prod-${RandomGenerator.alphaNumeric(10)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.paragraph({ sentences: 6 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 2 }),
    status: "active",
    primary_image_uri:
      "https://cdn.shopping-mall.test/images/sample-product.jpg" as string &
        tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 5. Admin associates product with category
  const adminAuthorizedForCategory: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorizedForCategory);

  const productCategoryCreateBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;

  const productCategoryLink: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: product.id,
        body: productCategoryCreateBody,
      },
    );
  typia.assert(productCategoryLink);

  // 6. Seller creates product–tag link
  const sellerAuthorizedForTagLink: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedForTagLink);

  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const tagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagLinkCreateBody,
    });
  typia.assert(tagLink);

  // Sanity check: ensure link belongs to product and tag
  TestValidator.equals(
    "created tag link should reference the product",
    tagLink.product_id,
    product.id,
  );
  TestValidator.equals(
    "created tag link should reference the tag",
    tagLink.product_tag_id,
    productTag.id,
  );

  // Optional: prove that GET works for the real link
  const fetchedLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.products.tags.at(connection, {
      productId: product.id,
      productTagLinkId: tagLink.id,
    });
  typia.assert(fetchedLink);
  TestValidator.equals(
    "fetched link id should match created link id",
    fetchedLink.id,
    tagLink.id,
  );

  // 7. Generate unrelated link id to simulate historical/soft-deleted link
  const unrelatedLinkId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  TestValidator.predicate(
    "unrelated link id must differ from real link id",
    unrelatedLinkId !== tagLink.id,
  );

  // 8. Call GET with unrelated link id and assert error (not found behavior)
  await TestValidator.error(
    "GET product tag link with non-existent link id should fail",
    async () => {
      await api.functional.shoppingMall.products.tags.at(connection, {
        productId: product.id,
        productTagLinkId: unrelatedLinkId,
      });
    },
  );
}
