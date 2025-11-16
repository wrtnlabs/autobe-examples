import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_registration_response_structure(
  connection: api.IConnection,
) {
  // Generate valid registration credentials
  const email = typia.random<string & tags.Format<"email">>();
  const username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_-]+$">
  >();
  const password = RandomGenerator.alphabets(12);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();

  // Register new moderator account
  const response: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email,
        username,
        password,
        href,
        referrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  // Validate complete response structure and all data types
  typia.assert(response);

  // Verify username matches request
  TestValidator.equals("username matches input", response.username, username);

  // Verify email matches request
  TestValidator.equals("email matches input", response.email, email);

  // Verify email is not verified for new accounts
  TestValidator.equals(
    "email_verified should be false for new account",
    response.email_verified,
    false,
  );

  // Verify account status is active
  TestValidator.equals(
    "account_status should be active",
    response.account_status,
    "active",
  );

  // Verify karma score is 0 for new accounts
  TestValidator.equals(
    "karma_score should be 0 for new account",
    response.karma_score,
    0,
  );

  // Verify deleted_at is null for active accounts
  TestValidator.equals(
    "deleted_at should be null for active account",
    response.deleted_at,
    null,
  );

  // Verify token object structure is valid
  const token: ICommunityPlatformMember = response.token;
  typia.assert(token);

  // Verify token expiration logic: refreshable_until should be after expired_at
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    new Date(token.refreshable_until).getTime() >
      new Date(token.expired_at).getTime(),
  );

  // Verify updated_at is on or after created_at
  TestValidator.predicate(
    "updated_at should be on or after created_at",
    new Date(response.updated_at).getTime() >=
      new Date(response.created_at).getTime(),
  );
}
