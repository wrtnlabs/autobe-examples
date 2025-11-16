import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that platform admin join enforces unique email and rejects duplicates.
 *
 * Business goal:
 *
 * - Ensure that platform administrator registration (POST
 *   /auth/platformAdmin/join) does not allow two admins with the same email in
 *   the platformAdmin actor scope.
 * - Confirm that the first registration with a given email succeeds and returns
 *   an authorized admin session, but a second registration attempt with the
 *   same email is rejected as a client error.
 * - Validate this purely as a business rule (duplicate joins must fail), without
 *   asserting any specific HTTP status code or error payload shape.
 *
 * Scenario:
 *
 * 1. Generate a deterministic, valid platform admin join payload using
 *    IShoppingMallPlatformAdminJoin.IRequest with a specific email.
 * 2. Call api.functional.auth.platformAdmin.join with this payload.
 *
 *    - Expect the call to succeed and return IShoppingMallPlatformAdmin.IAuthorized.
 *    - Assert the response type using typia.assert.
 *    - Assert that the returned email equals the requested email.
 * 3. Call api.functional.auth.platformAdmin.join again with the _same_ email
 *    (other fields can be different or identical; we keep them valid).
 *
 *    - Wrap this call in TestValidator.error to assert that some error is thrown.
 *    - Do not inspect error status code or message content, only that it fails.
 * 4. Because we have no listing/search endpoint for platform admins in this
 *    context, we cannot directly assert that only one admin exists. We rely on
 *    business guarantees that the join operation is transactional and does not
 *    create partial or duplicate records on failure.
 */
export async function test_api_platform_admin_join_rejects_duplicate_email(
  connection: api.IConnection,
) {
  // 1. Prepare a shared email address that will be reused to trigger duplicate join.
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  // 2. Build a valid join request payload using the shared email.
  const firstRequestBody = {
    email,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    // Optional IP field: we can explicitly set it to null.
    ip: null,
    href: "https://admin-console.shoppingmall.test/join",
    referrer: "https://admin-console.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  // 3. First join attempt should succeed.
  const firstJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: firstRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(firstJoin);

  // Basic business sanity check: returned email should equal requested email.
  TestValidator.equals(
    "platform admin join: first registration returns same email",
    firstJoin.email,
    email,
  );

  // 4. Second join attempt with the same email should fail.
  // We construct another valid body using the identical email but otherwise
  // arbitrary valid values.
  const secondRequestBody = {
    email,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin-console.shoppingmall.test/join?attempt=2",
    referrer: "https://admin-console.shoppingmall.test/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  await TestValidator.error(
    "platform admin join: duplicate email registration must fail",
    async () => {
      await api.functional.auth.platformAdmin.join(connection, {
        body: secondRequestBody,
      });
    },
  );
}
