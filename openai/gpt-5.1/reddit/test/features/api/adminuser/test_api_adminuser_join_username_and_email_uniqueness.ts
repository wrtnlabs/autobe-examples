import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Ensure adminUser join enforces username and email uniqueness among active
 * accounts.
 *
 * Business goal
 *
 * - Only one active (non-deleted) adminUser may exist per username.
 * - Only one active adminUser may exist per email address.
 * - Join returns an authorized admin context when successful.
 * - Subsequent join attempts that reuse an existing username or email must fail
 *   as business-validation errors (not generic server crashes).
 *
 * Scope of this test
 *
 * - Covers the happy-path creation of the first adminUser.
 * - Covers two failure scenarios:
 *
 *   1. Duplicate username with a different email.
 *   2. Duplicate email with a different username.
 * - Does not assert concrete HTTP status codes or error payload shapes, only that
 *   the call fails (throws) for business reasons.
 *
 * High-level flow
 *
 * 1. Generate a valid admin join payload (username A, email E, password P).
 * 2. Call api.functional.auth.adminUser.join(connection, { body }) to create the
 *    initial adminUser and receive an authorized context.
 * 3. Attempt to join again with:
 *
 *    - Same username A, new email E2.
 *    - Same email E, new username A2.
 * 4. For each duplicate attempt, assert that join throws using TestValidator.error
 *    (business validation).
 *
 * Notes
 *
 * - We rely on typia.assert() to validate the shape of the successful response.
 * - We do not inspect HttpError, status codes, or error messages to avoid
 *   coupling tests to transport details.
 */
export async function test_api_adminuser_join_username_and_email_uniqueness(
  connection: api.IConnection,
) {
  // 1. Create baseline adminUser with unique username and email
  const baseRequest = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const firstJoin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: baseRequest,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(firstJoin);

  // Assert echo of key identity fields
  TestValidator.equals(
    "created admin username should match request.username",
    firstJoin.username,
    baseRequest.username,
  );
  TestValidator.equals(
    "created admin email should match request.email",
    firstJoin.email,
    baseRequest.email,
  );

  // 2. Attempt join with duplicate username but different email
  const duplicateUsernameRequest = {
    username: baseRequest.username,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  await TestValidator.error(
    "joining with an existing username but new email must fail",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: duplicateUsernameRequest,
      });
    },
  );

  // 3. Attempt join with duplicate email but different username
  const duplicateEmailRequest = {
    username: RandomGenerator.name(1),
    email: baseRequest.email,
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  await TestValidator.error(
    "joining with an existing email but new username must fail",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: duplicateEmailRequest,
      });
    },
  );
}
