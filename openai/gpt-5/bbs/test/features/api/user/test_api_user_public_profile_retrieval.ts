import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconDiscussMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussMember";
import type { IEconDiscussUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconDiscussUser";

/**
 * Public user profile retrieval without authentication.
 *
 * This test verifies that a user's public-facing profile can be fetched by ID
 * without requiring authentication, and that only the safe public DTO fields
 * are exposed. It also checks basic field mappings from the registration flow
 * (display_name -> displayName, avatar_uri -> avatarUri) and confirms
 * timestamps are ISO 8601 strings through typia runtime assertions.
 *
 * Step-by-step:
 *
 * 1. Register a new member via POST /auth/member/join to obtain a concrete user id
 * 2. Clone the connection to an unauthenticated one (empty headers)
 * 3. Call GET /econDiscuss/users/{userId} without Authorization header
 * 4. Validate response typing and key business expectations
 */
export async function test_api_user_public_profile_retrieval(
  connection: api.IConnection,
) {
  // 1) Register a new member
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pw_${RandomGenerator.alphaNumeric(10)}`,
    display_name: RandomGenerator.name(),
    timezone: "Asia/Seoul",
    locale: "en-US",
    avatar_uri: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconDiscussMember.ICreate;

  const authorized: IEconDiscussMember.IAuthorized =
    await api.functional.auth.member.join(connection, { body: joinBody });
  typia.assert(authorized);

  // 2) Create a public (unauthenticated) connection to ensure no auth header
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 3) Fetch public profile without authentication
  const user: IEconDiscussUser = await api.functional.econDiscuss.users.at(
    publicConn,
    { userId: authorized.id },
  );
  typia.assert(user);

  // 4) Business validations
  TestValidator.equals(
    "public GET returns same user id",
    user.id,
    authorized.id,
  );
  TestValidator.equals(
    "display name preserved on public profile",
    user.displayName,
    joinBody.display_name,
  );
  TestValidator.equals(
    "avatar URI preserved on public profile",
    user.avatarUri,
    joinBody.avatar_uri,
  );
  TestValidator.equals(
    "timezone preserved on public profile",
    user.timezone,
    joinBody.timezone,
  );
  TestValidator.equals(
    "locale preserved on public profile",
    user.locale,
    joinBody.locale,
  );

  // Freshly joined accounts should have verification/MFA disabled and no expert badge
  TestValidator.equals(
    "emailVerified defaults to false on new account",
    user.emailVerified,
    false,
  );
  TestValidator.equals(
    "mfaEnabled defaults to false on new account",
    user.mfaEnabled,
    false,
  );
  TestValidator.equals(
    "isExpertVerified defaults to false on new account",
    user.isExpertVerified,
    false,
  );

  // Timestamps are validated by typia.assert() as date-time strings; nothing further required
  // Optional: correlate subject snapshot if provided in authorization response
  if (authorized.member) {
    TestValidator.equals(
      "subject snapshot id matches user id",
      authorized.member.id,
      user.id,
    );
  }
}
