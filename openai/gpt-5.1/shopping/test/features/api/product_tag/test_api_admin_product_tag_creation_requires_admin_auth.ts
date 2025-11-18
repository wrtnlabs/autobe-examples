import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Ensure that creating shopping mall product tags is restricted to
 * authenticated admin actors.
 *
 * Business context:
 *
 * - Product tags are administrative catalog constructs that should only be
 *   created by authenticated admins via /shoppingMall/admin/productTags.
 * - The SDK automatically manages Authorization headers on the shared connection
 *   when admin join/login flows are executed.
 *
 * This test verifies:
 *
 * 1. An unauthenticated request (simulated via a cloned connection with empty
 *    headers) fails when attempting to create a product tag, even with a
 *    syntactically valid IShoppingMallProductTag.ICreate body.
 * 2. A properly authenticated admin, obtained via POST /auth/admin/join, can
 *    successfully create a product tag with the same payload.
 *
 * High-level steps:
 *
 * 1. Construct a valid product-tag creation DTO (IShoppingMallProductTag.ICreate).
 * 2. Clone the incoming connection into an unauthenticated variant with headers:
 *    {} and call productTags.create, asserting that an error is thrown.
 * 3. Perform an admin join using api.functional.auth.admin.join with a valid
 *    IShoppingMallAdminJoin.ICreate body, establishing an authenticated admin
 *    context on the original connection.
 * 4. Call productTags.create on the authenticated connection with the same
 *    product-tag body and assert that creation succeeds and returns a
 *    IShoppingMallProductTag.
 */
export async function test_api_admin_product_tag_creation_requires_admin_auth(
  connection: api.IConnection,
) {
  // 1. Prepare a valid product tag creation body
  const tagBody = {
    code: RandomGenerator.alphaNumeric(12),
    label: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    isActive: true,
  } satisfies IShoppingMallProductTag.ICreate;

  // 2. Simulate unauthenticated connection by cloning with empty headers
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.error(
    "creating product tag without admin auth must fail",
    async () => {
      await api.functional.shoppingMall.admin.productTags.create(
        unauthenticatedConnection,
        {
          body: tagBody,
        },
      );
    },
  );

  // 3. Join as admin to obtain valid admin authorization on the original connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. Now, using the authenticated connection, create the same product tag
  const createdTag: IShoppingMallProductTag =
    await api.functional.shoppingMall.admin.productTags.create(connection, {
      body: tagBody,
    });
  typia.assert(createdTag);
}
