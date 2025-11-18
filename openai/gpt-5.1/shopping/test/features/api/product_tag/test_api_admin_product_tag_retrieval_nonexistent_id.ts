import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

/**
 * Ensure admin cannot retrieve a non-existent product tag.
 *
 * Business goal: Verify that the admin-facing product-tag detail endpoint
 * behaves safely when asked for a tag ID that does not exist in
 * `shopping_mall_product_tags`. The platform must respond with an error instead
 * of returning a valid IShoppingMallProductTag body, and the test must confirm
 * that successful retrieval does not occur for such IDs.
 *
 * Scenario steps:
 *
 * 1. Register a new admin using POST /auth/admin/join so that subsequent calls are
 *    authenticated as an administrator.
 * 2. Generate a syntactically valid random UUID which will serve as a tag ID that
 *    almost certainly does not exist in the database.
 * 3. Invoke GET /shoppingMall/admin/productTags/{productTagId} with that random
 *    UUID.
 * 4. Assert that the call throws an error (e.g., not-found), using
 *    TestValidator.error, without checking the exact HTTP status code.
 * 5. Ensure that, if for any reason the call succeeds and returns an
 *    IShoppingMallProductTag, the test fails explicitly.
 */
export async function test_api_admin_product_tag_retrieval_nonexistent_id(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // ip is optional and nullable; omit it to let backend derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Generate a random UUID to act as a non-existent product tag ID
  const nonexistentTagId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3 & 4. Attempt to fetch the tag and verify it fails with an error
  await TestValidator.error(
    "nonexistent product tag lookup must fail",
    async () => {
      // If this call unexpectedly succeeds, we explicitly fail the test
      const tag: IShoppingMallProductTag =
        await api.functional.shoppingMall.admin.productTags.at(connection, {
          productTagId: nonexistentTagId,
        });
      typia.assert<IShoppingMallProductTag>(tag);

      // Explicit failure path: reaching here means no error was thrown
      throw new Error(
        "Expected product tag lookup with nonexistent ID to fail, but it succeeded.",
      );
    },
  );
}
