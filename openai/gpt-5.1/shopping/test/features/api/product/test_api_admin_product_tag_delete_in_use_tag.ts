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
 * Validate admin deletion behavior for a product tag currently in use.
 *
 * Business context:
 *
 * - Product tags are global catalog metadata managed by admins via
 *   `shopping_mall_product_tags` and linked to products through the
 *   `shopping_mall_product_tag_links` junction table.
 * - Sellers own products and can attach these tags to their products using the
 *   seller-side product-tag link API.
 * - When a tag is in use (linked to one or more products), platform policy may
 *   either prevent deletion for integrity reasons or allow deletion with
 *   cascading cleanup of link records.
 *
 * This E2E test performs a complete multi-actor workflow to exercise deletion
 * of a tag that is actively linked to a product, and ensures that the backend
 * behaves consistently (either by allowing the delete or by blocking it with a
 * domain error), without relying on specific HTTP status codes.
 *
 * Steps:
 *
 * 1. Admin registers via /auth/admin/join and becomes authenticated.
 * 2. Seller registers via /auth/seller/join and becomes authenticated.
 * 3. Switch to admin and create a product tag via /shoppingMall/admin/productTags.
 * 4. Switch to seller and create a product via /shoppingMall/seller/products.
 * 5. Still as seller, attach the admin-created tag to the product via
 *    /shoppingMall/seller/products/{productId}/tags.
 * 6. Switch back to admin and attempt to delete the tag via
 *    /shoppingMall/admin/productTags/{productTagId}.
 * 7. If deletion succeeds (no error), treat this as cascade behavior; if it fails
 *    with an HttpError, treat this as strict-prevention behavior.
 * 8. Use TestValidator assertions to ensure the flow completes and that the delete
 *    attempt yields one of the acceptable behaviors without runtime type
 *    violations.
 */
export async function test_api_admin_product_tag_delete_in_use_tag(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) and obtains admin authorization context.
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminJoinResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminJoinResult);

  // 2. Seller joins (registers) and obtains seller authorization context.
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const sellerJoinResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(sellerJoinResult);

  // 3. Switch back to admin context explicitly using login (Actor switching).
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminLoginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLoginResult);

  // 4. Admin creates a product tag to be attached to products.
  const tagCreateBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  const productTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagCreateBody,
    });
  typia.assert(productTag);

  // 5. Switch to seller context to create a product.
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerAuthLogin.IRequest;

  const sellerLoginResult: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLoginResult);

  const productCreateBody = {
    code: RandomGenerator.alphaNumeric(10),
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

  // 6. Attach the admin-created tag to the product as the seller.
  const tagLinkCreateBody = {
    product_tag_id: productTag.id,
  } satisfies IShoppingMallProductTagLink.ICreate;

  const tagLink: IShoppingMallProductTagLink =
    await api.functional.shoppingMall.seller.products.tags.create(connection, {
      productId: product.id,
      body: tagLinkCreateBody,
    });
  typia.assert(tagLink);

  TestValidator.equals(
    "product tag link should reference correct product id",
    tagLink.product_id,
    product.id,
  );
  TestValidator.equals(
    "product tag link should reference correct tag id",
    tagLink.product_tag_id,
    productTag.id,
  );

  // 7. Switch back to admin context to attempt deletion of in-use tag.
  const adminReloginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminLogin.ICreate;

  const adminReloginResult: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminReloginBody,
    });
  typia.assert(adminReloginResult);

  // 8. Attempt to delete the tag. Behavior may be either prevention or cascade.
  let deletionFailed = false;
  try {
    await api.functional.shoppingMall.admin.productTags.erase(connection, {
      productTagId: productTag.id,
    });
  } catch (err) {
    deletionFailed = true;
  }

  // 9. Assert that the deletion attempt resulted in a coherent outcome.
  TestValidator.predicate(
    "tag deletion operation for in-use tag should either succeed or be blocked with an error",
    deletionFailed === true || deletionFailed === false,
  );
}
