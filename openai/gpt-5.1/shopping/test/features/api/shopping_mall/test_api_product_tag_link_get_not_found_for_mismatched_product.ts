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
 * Verify that product–tag link retrieval is scoped to the owning product and
 * that a mismatched productId + productTagLinkId combination results in a
 * not-found style error instead of leaking tag link details.
 *
 * Business context:
 *
 * - Product tags are attached to specific products via
 *   shopping_mall_product_tag_links.
 * - A public/product-level GET endpoint exposes a single link as
 *   /shoppingMall/products/{productId}/tags/{productTagLinkId}.
 * - For security and data isolation, a link must only be retrievable when the
 *   productId path parameter matches the owning product of that link.
 *
 * Flow under test:
 *
 * 1. Admin joins and logs in to manage catalog master data.
 * 2. Admin creates a category and a product tag master.
 * 3. Seller A joins and creates Product A.
 * 4. Admin associates Product A with the created category.
 * 5. Seller A attaches the admin-created tag to Product A, producing
 *    productTagLink A.
 * 6. Seller B joins and creates Product B.
 * 7. From a public/products context, call GET
 *    /shoppingMall/products/{productBId}/tags/{productTagLinkAId}.
 * 8. Assert that the GET fails with an error (not-found style) rather than
 *    returning the tag link, confirming that the link cannot be fetched under a
 *    different product.
 */
export async function test_api_product_tag_link_get_not_found_for_mismatched_product(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@admin.test`,
    password: "AdminPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://admin.test/join" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;
  const adminJoined: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminJoined);

  // 2. Admin login (switch context explicitly, though join already authenticates)
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.test/login" as string & tags.Format<"uri">,
    referrer: "https://admin.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallAdminLogin.ICreate;
  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLoggedIn);

  // 3. Admin creates a category
  const categoryBody = {
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
      body: categoryBody,
    });
  typia.assert(category);

  // 4. Admin creates a product tag master
  const productTagBody = {
    code: `tag-${RandomGenerator.alphaNumeric(8)}`,
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;
  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: productTagBody,
    });
  typia.assert(productTag);

  // 5. Seller A joins
  const sellerAJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller-a.test` as string &
      tags.Format<"email">,
    password: "SellerAPassw0rd!" as string & tags.Format<"password">,
    ip: `${typia.random<string & tags.Format<"ipv4">>()}` satisfies
      | string
      | null
      | undefined,
    href: "https://seller-a.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller-a.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerAJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerAJoinBody,
    });
  typia.assert(sellerAJoined);

  // 6. Seller A login to ensure seller context is active (though join has set token)
  const sellerALoginBody = {
    email: sellerAJoinBody.email,
    password: sellerAJoinBody.password,
    ip: null,
    href: "https://seller-a.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller-a.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerALoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerALoggedIn);

  // 7. Seller A creates Product A
  const productABody = {
    code: `PA-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.test/images/product-a.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productA: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productABody,
    });
  typia.assert(productA);

  // 8. Switch back to admin for category association
  const adminRelogin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminRelogin);

  // 9. Admin associates Product A with the category
  const productACategoryBody = {
    shopping_mall_category_id: category.id,
    is_primary: true,
  } satisfies IShoppingMallProductCategory.ICreate;
  const productACategory: IShoppingMallProductCategory =
    await api.functional.shoppingMall.admin.products.categories.create(
      connection,
      {
        productId: productA.id,
        body: productACategoryBody,
      },
    );
  typia.assert(productACategory);
  TestValidator.equals(
    "product category link belongs to Product A",
    productACategory.shopping_mall_product_id,
    productA.id,
  );

  // 10. Switch to seller A to attach tag to Product A
  const sellerARelogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerALoginBody,
    });
  typia.assert(sellerARelogin);

  const tagLinkABody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;
  const tagLinkA: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: productA.id,
      body: tagLinkABody,
    });
  typia.assert(tagLinkA);
  TestValidator.equals(
    "tag link A is attached to Product A",
    tagLinkA.product_id,
    productA.id,
  );
  TestValidator.equals(
    "tag link A references the created product tag",
    tagLinkA.product_tag_id,
    productTag.id,
  );

  // 11. Seller B joins
  const sellerBJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@seller-b.test` as string &
      tags.Format<"email">,
    password: "SellerBPassw0rd!" as string & tags.Format<"password">,
    ip: null,
    href: "https://seller-b.test/join" as string & tags.Format<"uri">,
    referrer: "https://seller-b.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthJoin.IRequest;
  const sellerBJoined: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerBJoinBody,
    });
  typia.assert(sellerBJoined);

  // 12. Seller B login
  const sellerBLoginBody = {
    email: sellerBJoinBody.email,
    password: sellerBJoinBody.password,
    ip: null,
    href: "https://seller-b.test/login" as string & tags.Format<"uri">,
    referrer: "https://seller-b.test/landing" as string & tags.Format<"uri">,
  } satisfies IShoppingMallSellerAuthLogin.IRequest;
  const sellerBLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerBLoginBody,
    });
  typia.assert(sellerBLoggedIn);

  // 13. Seller B creates Product B
  const productBBody = {
    code: `PB-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 4 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: RandomGenerator.paragraph({ sentences: 2 }),
    model_name: RandomGenerator.paragraph({ sentences: 1 }),
    status: "active",
    primary_image_uri: "https://cdn.test/images/product-b.jpg" as string &
      tags.Format<"uri">,
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;
  const productB: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productBBody,
    });
  typia.assert(productB);

  // 14. Negative test - mismatched productId and productTagLinkId
  await TestValidator.error(
    "mismatched product and tag link should return not-found style error",
    async () => {
      await api.functional.shoppingMall.products.tags.at(connection, {
        productId: productB.id,
        productTagLinkId: tagLinkA.id,
      });
    },
  );
}
