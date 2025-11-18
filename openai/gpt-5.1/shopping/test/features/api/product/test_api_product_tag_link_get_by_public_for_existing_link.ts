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

export async function test_api_product_tag_link_get_by_public_for_existing_link(
  connection: api.IConnection,
) {
  // 1. Admin joins to bootstrap an admin actor.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.local/join",
    referrer: "https://admin.shoppingmall.local/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Admin login (explicit login to validate login flow and ensure token refresh path works).
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.shoppingmall.local/login",
    referrer: "https://admin.shoppingmall.local/join",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoggedIn: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoggedIn);

  // 3. Create a category as admin.
  const categoryCreateBody = {
    parent_id: null,
    slug: RandomGenerator.alphaNumeric(12),
    name_en: RandomGenerator.paragraph({ sentences: 2 }),
    description_en: RandomGenerator.paragraph({ sentences: 4 }),
    status: "active",
    sort_order: 1,
    is_leaf: true,
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryCreateBody,
    });
  typia.assert(category);

  // 4. Create a product tag master as admin.
  const productTagCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: productTagCreateBody,
    });
  typia.assert(productTag);

  // 5. Seller joins to own the product.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://seller.shoppingmall.local/join",
    referrer: "https://seller.shoppingmall.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // 6. Seller login to obtain a fresh session (and to mirror realistic flows).
  const sellerLoginBody = {
    email: sellerJoinBody.email,
    password: sellerJoinBody.password,
    ip: null,
    href: "https://seller.shoppingmall.local/login",
    referrer: "https://seller.shoppingmall.local/join",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoggedIn: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoggedIn);

  // 7. Seller creates a product.
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

  // 8. Admin links the product to the category.
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
  typia.assert(productCategory);

  // 9. Seller attaches the tag to the product (creating the product_tag_link).
  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const createdTagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagLinkCreateBody,
    });
  typia.assert(createdTagLink);

  // 10. Prepare a public (unauthenticated) connection by cloning without headers.
  const publicConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 11. Public caller fetches the product–tag link by productId and productTagLinkId.
  const fetchedTagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.products.tags.at(publicConnection, {
      productId: product.id,
      productTagLinkId: createdTagLink.id,
    });
  typia.assert(fetchedTagLink);

  // 12. Validate identity and foreign key consistency.
  TestValidator.equals(
    "link id must match created tag link id",
    fetchedTagLink.id,
    createdTagLink.id,
  );

  TestValidator.equals(
    "product_id on link must match product.id",
    fetchedTagLink.product_id,
    product.id,
  );

  TestValidator.equals(
    "product_tag_id on link must match created product tag id",
    fetchedTagLink.product_tag_id,
    productTag.id,
  );

  // 13. If embedded product summary is present, validate basic consistency.
  if (fetchedTagLink.product !== undefined) {
    const embeddedProduct = fetchedTagLink.product;
    TestValidator.equals(
      "embedded product summary id matches product.id",
      embeddedProduct.id,
      product.id,
    );

    // IShoppingMallProduct.ISummary.name is a general product name; map to title.
    TestValidator.equals(
      "embedded product summary name reflects created product title",
      embeddedProduct.name,
      product.title,
    );
  }

  // 14. If embedded product_tag summary is present, validate its consistency.
  if (fetchedTagLink.product_tag !== undefined) {
    const embeddedTag = fetchedTagLink.product_tag;
    TestValidator.equals(
      "embedded product_tag summary id matches productTag.id",
      embeddedTag.id,
      productTag.id,
    );

    TestValidator.equals(
      "embedded product_tag summary name matches productTag.name",
      embeddedTag.name,
      productTag.name,
    );

    TestValidator.equals(
      "embedded product_tag summary slug matches productTag.slug",
      embeddedTag.slug,
      productTag.slug,
    );
  }
}
