import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallFulfillmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFulfillmentItem";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify platform-admin fulfillment item retrieval returns an error when the
 * requested fulfillment or fulfillment item does not exist.
 *
 * Business goal
 *
 * - Ensure the platformAdmin-facing read endpoint for a single fulfillment item
 *   does not accidentally leak data for unrelated or existing records when
 *   called with non-existent identifiers.
 * - Confirm that the system responds with a failure when both fulfillment and
 *   fulfillmentItem IDs are invalid, instead of returning a random existing
 *   fulfillment item or succeeding incorrectly.
 *
 * High-level flow
 *
 * 1. Register a new platform administrator via POST /auth/platformAdmin/join.
 *
 *    - This step is required so that subsequent calls to the
 *         /shoppingMall/platformAdmin/fulfillments/... endpoints are made in an
 *         authenticated admin context.
 * 2. Using the authenticated connection, build a pair of random UUID values for
 *    `fulfillmentId` and `fulfillmentItemId`.
 *
 *    - The test environment uses an isolated database, and these random UUIDs are
 *         not inserted anywhere in this test, so they will not correspond to
 *         any real fulfillment or fulfillment item record.
 * 3. Call GET
 *    /shoppingMall/platformAdmin/fulfillments/{fulfillmentId}/items/{fulfillmentItemId}
 *    using those IDs.
 * 4. Validate that the call fails with an HttpError and does not return a normal
 *    IShoppingMallFulfillmentItem response.
 *
 *    - We do NOT assert a specific HTTP status code number, only that an HttpError
 *         is thrown, to align with the E2E testing guidelines that
 *         status-code-specific checks are out of scope.
 *    - We also do not inspect an error body contract directly; the focus here is
 *         ensuring that a success-path DTO is not returned for invalid IDs.
 *
 * Key assertions
 *
 * - After successful join, the returned platform admin session object is
 *   `IShoppingMallPlatformAdmin.IAuthorized` and passes typia.assert.
 * - When calling the fulfillment item `at` endpoint with random UUIDs, the
 *   promise rejects rather than resolving to IShoppingMallFulfillmentItem.
 * - The error is surfaced through TestValidator.error, confirming robust error
 *   handling for invalid identifiers without relying on type-system tricks or
 *   status-code-specific assertions.
 */
export async function test_api_platform_admin_fulfillment_item_retrieval_for_nonexistent_resource_not_found(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator to obtain an authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.test.shopping-mall.local/join",
    referrer: "https://admin.test.shopping-mall.local/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare non-existent fulfillment and item IDs
  const nonexistentFulfillmentId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentFulfillmentItemId = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Invoke the fulfillment item retrieval endpoint with random UUIDs
  await TestValidator.error(
    "non-existent fulfillment item should fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.fulfillments.items.at(
        connection,
        {
          fulfillmentId: nonexistentFulfillmentId,
          fulfillmentItemId: nonexistentFulfillmentItemId,
        },
      );
    },
  );
}
