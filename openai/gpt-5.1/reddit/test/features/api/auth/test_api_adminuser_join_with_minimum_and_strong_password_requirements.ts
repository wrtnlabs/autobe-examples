import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminUserJoin";
import type { ICommunityPlatformAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdminuser";

/**
 * Validate that adminUser join enforces password strength rules.
 *
 * Business goal:
 *
 * - Ensure that creating an administrative account via POST /auth/adminUser/join
 *   enforces password strength policies so that weak passwords are rejected
 *   while strong passwords succeed.
 *
 * Scenario:
 *
 * 1. Try to register an adminUser with a weak password and otherwise valid, unique
 *    username and email. Expect the backend to reject the join attempt due to
 *    password policy.
 * 2. Then register another adminUser with a strong password that should pass
 *    typical complexity and length requirements. Expect the join to succeed and
 *    return an authorized admin context including token information.
 *
 * Notes:
 *
 * - We do not validate HTTP status codes or error payloads; we only assert that
 *   an error is thrown for the weak-password attempt.
 * - We use strictly valid DTO shapes: `ICommunityPlatformAdminUserJoin.IRequest`
 *   for the request body and `ICommunityPlatformAdminuser.IAuthorized` for the
 *   success response, with `typia.assert` for runtime type validation.
 */
export async function test_api_adminuser_join_with_minimum_and_strong_password_requirements(
  connection: api.IConnection,
) {
  // Generate a base suffix to ensure uniqueness across usernames/emails
  const uniqueSuffix: string = RandomGenerator.alphaNumeric(12);

  const weakUsername: string = `admin_weak_${uniqueSuffix}`;
  const strongUsername: string = `admin_strong_${uniqueSuffix}`;

  const weakEmail: string = `${weakUsername}@example.com`;
  const strongEmail: string = `${strongUsername}@example.com`;

  // 1. Attempt join with a weak password
  const weakRequestBody = {
    username: weakUsername,
    email: weakEmail,
    // Intentionally simple password that is likely below policy thresholds
    password: "weakpass", // short, lowercase only
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  await TestValidator.error(
    "adminUser join should reject weak password",
    async () => {
      await api.functional.auth.adminUser.join(connection, {
        body: weakRequestBody,
      });
    },
  );

  // 2. Attempt join with a strong password
  const strongRequestBody = {
    username: strongUsername,
    email: strongEmail,
    // A reasonably complex password: upper+lower+digits+special characters, length >= 12
    password: "Str0ng!Admin#Pass1",
  } satisfies ICommunityPlatformAdminUserJoin.IRequest;

  const authorized = await api.functional.auth.adminUser.join(connection, {
    body: strongRequestBody,
  });

  // Validate the successful response type
  typia.assert<ICommunityPlatformAdminuser.IAuthorized>(authorized);

  // Basic business-level assertions
  TestValidator.equals(
    "authorized admin username should match strong join username",
    authorized.username,
    strongRequestBody.username,
  );

  TestValidator.equals(
    "authorized admin email should match strong join email",
    authorized.email,
    strongRequestBody.email,
  );

  // Validate token structure
  typia.assert<IAuthorizationToken>(authorized.token);

  TestValidator.predicate(
    "access token string should be non-empty",
    authorized.token.access.length > 0,
  );

  TestValidator.predicate(
    "refresh token string should be non-empty",
    authorized.token.refresh.length > 0,
  );
}
