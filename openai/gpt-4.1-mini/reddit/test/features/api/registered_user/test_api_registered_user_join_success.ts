import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityRegisteredUser";

/**
 * Test successful account registration for a new registered user.
 *
 * This test covers a user submitting valid registration data compliant with the
 * IRedditCommunityRegisteredUser.IJoin schema, ensuring that the backend
 * correctly creates the user account and returns authorized user details and
 * JWT tokens.
 *
 * Workflow:
 *
 * 1. Call prerequisite join function to establish user context.
 * 2. Generate a compliant join request with valid email and session URLs.
 * 3. Call the join API.
 * 4. Assert response type integrity with typia.
 * 5. Validate critical business properties like user id, email, status, and
 *    tokens.
 */
export async function test_api_registered_user_join_success(
  connection: api.IConnection,
) {
  // 1. Prerequisite join to set authentication context
  const dependencyJoinRequest: IRedditCommunityRegisteredUser.IJoin = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/signup?session=${RandomGenerator.alphaNumeric(8)}`,
    referrer: "https://example.com/landing",
    ip: null,
  };
  const prerequisiteResponse: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: dependencyJoinRequest,
    });
  typia.assert(prerequisiteResponse);

  // 2. Main test case: generate valid join request
  const requestBody: IRedditCommunityRegisteredUser.IJoin = {
    typeName: "IRedditCommunityRegisteredUser.IJoin",
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: `https://example.com/signup?session=${RandomGenerator.alphaNumeric(8)}`,
    referrer: "https://example.com/welcome",
    ip: null,
  };

  // 3. Call the join API
  const output: IRedditCommunityRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: requestBody,
    });

  // 4. Assert the response type
  typia.assert(output);

  // 5. Validate business properties
  TestValidator.predicate(
    "user id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      output.id,
    ),
  );
  TestValidator.predicate(
    "email is formatted correctly",
    /^[^@]+@[^@]+\.[^@]+$/.test(output.email),
  );
  TestValidator.predicate(
    "status is within allowed enum",
    output.status === "active" ||
      output.status === "inactive" ||
      output.status === "banned",
  );
  TestValidator.predicate(
    "token has non-empty access",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token has non-empty refresh",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO date",
    !isNaN(Date.parse(output.token.expired_at)),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO date",
    !isNaN(Date.parse(output.token.refreshable_until)),
  );
}
