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
 * Verify that deleting a product–tag link requires seller authentication.
 *
 * Business goal: Ensure that the DELETE
 * /shoppingMall/seller/products/{productId}/tags/{productTagLinkId} endpoint
 * cannot be used by anonymous callers (no Authorization header), while the same
 * operation succeeds when performed by the owning, authenticated seller. This
 * protects catalog tagging from unauthorized modification.
 *
 * High level flow:
 *
 * 1. Seller self-registers (join) and becomes the authenticated seller actor.
 * 2. As that seller, create a product via seller products.create.
 * 3. Create an admin account and login as admin.
 * 4. As admin, create a catalog tag via admin.productTags.create.
 * 5. Switch back to the seller actor by logging in as the seller.
 * 6. As seller, create a product–tag link for the product using
 *    seller.products.tags.create.
 * 7. Using a separate, unauthenticated connection (no Authorization header),
 *    attempt to erase that product–tag link with seller.products.tags.erase and
 *    assert that an error is raised (without checking specific status).
 * 8. Repeat a second unauthorized erase attempt using another fresh
 *    unauthenticated connection to ensure behavior is consistent.
 * 9. Finally, using the authenticated seller connection again, call erase for the
 *    same productId and productTagLinkId and assert that the call completes
 *    successfully (no error is thrown).
 *
 * Note: There is no read/list API for tag links available in this context, so
 * we assert only on the presence or absence of errors, not on persistence
 * state.
 */
export async function test_api_product_tag_link_deletion_unauthenticated(
  connection: api.IConnection,
) {
  // 1. Seller joins to obtain an authenticated seller context.
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://seller.console.local/join",
    referrer: "https://seller.console.local/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerAuthorized);

  // Keep seller credentials for later login.
  const sellerEmail: string & tags.Format<"email"> = sellerAuthorized.email;
  const sellerPassword: string & tags.Format<"password"> =
    sellerJoinBody.password;

  // 2. As seller, create a product.
  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    summary: RandomGenerator.paragraph({ sentences: 5 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    brand: "AutoBE-Test-Brand",
    model_name: "Model-" + RandomGenerator.alphaNumeric(6),
    status: "active",
    primary_image_uri:
      "https://cdn.autobe.test/images/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg",
    default_locale: "en-US",
  } satisfies IShoppingMallProduct.ICreate;

  const product: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(connection, {
      body: productCreateBody,
    });
  typia.assert(product);

  // 3. Register an admin and 4. login as admin.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) as string &
      tags.Format<"password">,
    ip: null,
    href: "https://admin.console.local/join",
    referrer: "https://admin.console.local/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorizedFromJoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorizedFromJoin);

  // Explicit admin login to simulate normal workflow.
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
    ip: null,
    href: "https://admin.console.local/login",
    referrer: "https://admin.console.local/landing",
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuthorized);

  // 4. As admin, create a product tag.
  const tagCreateBody = {
    code: "tag-" + RandomGenerator.alphaNumeric(8),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: "Tag for authentication E2E test",
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const tag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(tag);

  // 5. Switch back to seller by logging in using seller email/password.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.console.local/login",
    referrer: "https://seller.console.local/landing",
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerAuthorizedFromLogin: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerAuthorizedFromLogin);

  // 6. As seller, create a product–tag link.
  const tagLinkCreateBody = {
    product_tag_id: tag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const tagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagLinkCreateBody,
    });
  typia.assert(tagLink);

  // Sanity check: link belongs to the product we created.
  TestValidator.equals(
    "productTagLink.product_id matches product.id",
    tagLink.product_id,
    product.id,
  );

  // 7. Attempt to delete using an unauthenticated connection (no Authorization header).
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error("unauthenticated erase should fail", async () => {
    await api.functional.shoppingMall.seller.products.tags.erase(
      unauthConnection,
      {
        productId: product.id as string & tags.Format<"uuid">,
        productTagLinkId: tagLink.id as string & tags.Format<"uuid">,
      },
    );
  });

  // 8. Repeat with another fresh unauthenticated connection to confirm consistency.
  const anotherUnauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "repeat unauthenticated erase still fails",
    async () => {
      await api.functional.shoppingMall.seller.products.tags.erase(
        anotherUnauthConnection,
        {
          productId: product.id as string & tags.Format<"uuid">,
          productTagLinkId: tagLink.id as string & tags.Format<"uuid">,
        },
      );
    },
  );

  // 9. Perform the same erase with the authenticated seller connection.
  await api.functional.shoppingMall.seller.products.tags.erase(connection, {
    productId: product.id as string & tags.Format<"uuid">,
    productTagLinkId: tagLink.id as string & tags.Format<"uuid">,
  });

  // If we reach here, authenticated deletion has succeeded without error.
  TestValidator.predicate(
    "authenticated seller erase completes without throwing",
    true,
  );
}
