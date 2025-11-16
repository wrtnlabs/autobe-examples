import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserLogin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";
import type { ICommunityPlatformLoginAttempt } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformLoginAttempt";

/**
 * Validate that an authenticated adminUser can retrieve a login attempt record
 * via the admin-only GET
 * /communityPlatform/adminUser/loginAttempts/{loginAttemptId} endpoint.
 *
 * Business goals:
 *
 * 1. Ensure that an adminUser can be registered and logged in using the dedicated
 *    auth endpoints, obtaining a valid JWT-backed admin context.
 * 2. Invoke the loginAttempts.at endpoint with a UUID and validate that the
 *    returned payload conforms to ICommunityPlatformLoginAttempt, which
 *    represents immutable audit data about a single login attempt.
 * 3. Perform basic business-level sanity checks on core audit fields such as
 *    identifier, was_successful, source_ip, and temporal fields
 *    (occurred_at/created_at/updated_at), including internal consistency checks
 *    between timestamps.
 * 4. Exercise the error path by calling the same endpoint with a second random
 *    UUID and confirming that the SDK surfaces an error when the underlying
 *    record is not found or otherwise invalid, without asserting on specific
 *    HTTP status codes.
 *
 * Due to the limited API surface (no list or search for login attempts, and no
 * direct DB access), this test does not attempt to correlate a specific
 * loginAttemptId with the join/login calls. Instead, it focuses on type
 * correctness, field semantics, and the read-only nature of the endpoint from
 * the perspective of the public SDK.
 */
export async function test_api_admin_login_attempt_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new adminUser via /auth/adminUser/join
  const joinBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const joinedAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(joinedAdmin);

  // 2. Perform an admin login via /auth/adminUser/login to ensure audit flow
  const loginBody = {
    identifier: joinBody.email,
    password: joinBody.password,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/",
  } satisfies ICommunityPlatformAdminUserLogin.IRequest;

  const loggedInAdmin: ICommunityPlatformAdminuser.IAuthorized =
    await api.functional.auth.adminUser.login(connection, {
      body: loginBody,
    });
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(loggedInAdmin);

  // 3. Retrieve a login attempt using a random UUID
  const loginAttemptId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const attempt: ICommunityPlatformLoginAttempt =
    await api.functional.communityPlatform.adminUser.loginAttempts.at(
      connection,
      {
        loginAttemptId,
      },
    );
  typia.assert<ICommunityPlatformLoginAttempt>(attempt);

  // 4. Business-level sanity checks on core fields
  TestValidator.predicate(
    "login attempt identifier should be non-empty string",
    attempt.identifier.length > 0,
  );

  TestValidator.predicate(
    "login attempt source_ip should be non-empty string",
    attempt.source_ip.length > 0,
  );

  // Validate that temporal fields are parseable and internally consistent
  const occurredAt = new Date(attempt.occurred_at);
  const createdAt = new Date(attempt.created_at);
  const updatedAt = new Date(attempt.updated_at);

  TestValidator.predicate(
    "occurred_at should be a valid date",
    !Number.isNaN(occurredAt.getTime()),
  );
  TestValidator.predicate(
    "created_at should be a valid date",
    !Number.isNaN(createdAt.getTime()),
  );
  TestValidator.predicate(
    "updated_at should be a valid date",
    !Number.isNaN(updatedAt.getTime()),
  );

  TestValidator.predicate(
    "created_at should not be after updated_at",
    createdAt.getTime() <= updatedAt.getTime(),
  );

  // 5. Optional negative path: calling with another random UUID should error
  const nonExistentId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-existent loginAttemptId should fail",
    async () => {
      await api.functional.communityPlatform.adminUser.loginAttempts.at(
        connection,
        {
          loginAttemptId: nonExistentId,
        },
      );
    },
  );
}
