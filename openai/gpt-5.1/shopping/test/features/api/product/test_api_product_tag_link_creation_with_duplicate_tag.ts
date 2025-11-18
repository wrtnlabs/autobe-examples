import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
import type { IShoppingMallProductTagLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTagLink";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerAuthLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthLogin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate that creating a duplicate product–tag link for the same (productId,
 * product_tag_id) pair is rejected while the first association succeeds.
 *
 * Business context:
 *
 * - Sellers can create products under their own account.
 * - Admins manage the product tag master data.
 * - Sellers then attach those tags to their products through
 *   /shoppingMall/seller/products/{productId}/tags.
 * - The underlying shopping_mall_product_tag_links table is expected to enforce a
 *   uniqueness constraint on (product_id, product_tag_id).
 *
 * This test walks through a realistic multi-actor flow:
 *
 * 1. Register a seller via /auth/seller/join.
 * 2. Log the seller in via /auth/seller/login to establish a seller auth context
 *    on the connection.
 * 3. As the seller, create a product via /shoppingMall/seller/products using
 *    IShoppingMallProduct.ICreate and capture product.id.
 * 4. Register an admin via /auth/admin/join.
 * 5. Log the admin in via /auth/admin/login so that subsequent calls run in an
 *    admin context.
 * 6. As the admin, create a product tag via /shoppingMall/admin/productTags using
 *    IShoppingMallProductTag.ICreate and capture tag.id.
 * 7. Re-authenticate as the seller via /auth/seller/login so that seller-scoped
 *    product operations use the correct actor context.
 * 8. As the seller, create a first product–tag link using
 *    /shoppingMall/seller/products/{productId}/tags with
 *    IShoppingMallProductTagLink.ICreate, referencing the created product and
 *    tag; assert success and validate the response.
 * 9. Immediately attempt to create a second product–tag link with the same
 *    productId and product_tag_id. Expect the call to fail due to a
 *    uniqueness/business constraint and assert the error with
 *    TestValidator.error, without asserting on a specific HTTP status code.
 *
 * Note: The original scenario also described listing product tags for a product
 * to verify that only one link row exists for the (productId, product_tag_id)
 * pair. However, no list API for product tags under a product is present in the
 * provided SDK, so that final verification step is intentionally omitted here.
 */
export async function test_api_product_tag_link_creation_with_duplicate_tag(
  connection: api.IConnection,
) {
  // 1. Register a seller via /auth/seller/join
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinOutput);

  // Preserve seller email/password for later re-login
  const sellerEmail: string & tags.Format<"email"> = sellerJoinBody.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. Log the seller in via /auth/seller/login (ensures seller auth context)
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginOutput);

  // 3. As the seller, create a product via /shoppingMall/seller/products
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "TestBrand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
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

  // 4. Register an admin via /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(18) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinOutput);

  const adminEmail: string & tags.Format<"email"> = adminJoinBody.email;
  const adminPassword: string & tags.Format<"password"> =
    adminJoinBody.password;

  // 5. Log the admin in via /auth/admin/login
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginOutput: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginOutput);

  // 6. As the admin, create a product tag via /shoppingMall/admin/productTags
  const tagCode = "tag-" + RandomGenerator.alphaNumeric(8);
  const tagCreateBody = {
    code: tagCode,
    label: "Tag " + RandomGenerator.paragraph({ sentences: 1 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(tag);

  // 7. Re-authenticate as the seller via /auth/seller/login
  const sellerReloginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/dashboard",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerReloginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerReloginBody,
    });
  typia.assert(sellerReloginOutput);

  // 8. First product–tag link creation (expected to succeed)
  const firstLinkBody = {
    product_tag_id: tag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const firstLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: firstLinkBody,
    });
  typia.assert(firstLink);

  TestValidator.equals(
    "first link product and tag ids should match product and tag",
    {
      product_id: firstLink.product_id,
      product_tag_id: firstLink.product_tag_id,
    },
    {
      product_id: product.id,
      product_tag_id: tag.id,
    },
  );

  // 9. Second product–tag link creation with the same (product, tag)
  // pair is expected to fail due to uniqueness / business constraints.
  const duplicateLinkBody = {
    product_tag_id: tag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  await TestValidator.error(
    "duplicate product-tag link creation should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.create(
        connection,
        {
          productId: product.id,
          body: duplicateLinkBody,
        },
      );
    },
  );
}
