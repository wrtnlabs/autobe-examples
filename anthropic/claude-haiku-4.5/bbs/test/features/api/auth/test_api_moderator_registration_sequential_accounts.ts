import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

export async function test_api_moderator_registration_sequential_accounts(
  connection: api.IConnection,
) {
  /**
   * Register 3 distinct moderator accounts sequentially and verify each
   * registration succeeds with proper JWT token assignment. Validates that
   * accounts are properly isolated with unique IDs and authentication tokens.
   */

  // Account 1: First moderator registration
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const moderator1Password = "SecurePass123!";

  const result1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        username: moderator1Username,
        password: moderator1Password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(result1);
  TestValidator.equals(
    "moderator 1 email matches input",
    result1.email,
    moderator1Email,
  );
  TestValidator.equals(
    "moderator 1 username matches input",
    result1.username,
    moderator1Username,
  );
  TestValidator.equals(
    "moderator 1 account status is active",
    result1.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator 1 email not verified initially",
    result1.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator 1 has full moderation tier",
    result1.moderation_tier,
    "full",
  );

  // Account 2: Second moderator registration
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const moderator2Password = "AnotherPass456!";

  const result2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        username: moderator2Username,
        password: moderator2Password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(result2);
  TestValidator.equals(
    "moderator 2 email matches input",
    result2.email,
    moderator2Email,
  );
  TestValidator.equals(
    "moderator 2 username matches input",
    result2.username,
    moderator2Username,
  );
  TestValidator.equals(
    "moderator 2 account status is active",
    result2.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator 2 email not verified initially",
    result2.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator 2 has full moderation tier",
    result2.moderation_tier,
    "full",
  );

  // Account 3: Third moderator registration
  const moderator3Email = typia.random<string & tags.Format<"email">>();
  const moderator3Username = typia.random<
    string &
      tags.MinLength<3> &
      tags.MaxLength<50> &
      tags.Pattern<"^[a-zA-Z0-9_]+$">
  >();
  const moderator3Password = "ThirdPass789!";

  const result3: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator3Email,
        username: moderator3Username,
        password: moderator3Password,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(result3);
  TestValidator.equals(
    "moderator 3 email matches input",
    result3.email,
    moderator3Email,
  );
  TestValidator.equals(
    "moderator 3 username matches input",
    result3.username,
    moderator3Username,
  );
  TestValidator.equals(
    "moderator 3 account status is active",
    result3.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator 3 email not verified initially",
    result3.email_verified,
    false,
  );
  TestValidator.equals(
    "moderator 3 has full moderation tier",
    result3.moderation_tier,
    "full",
  );

  // Verify accounts are properly isolated with unique IDs
  TestValidator.notEquals(
    "moderator 1 and 2 have different IDs",
    result1.id,
    result2.id,
  );
  TestValidator.notEquals(
    "moderator 2 and 3 have different IDs",
    result2.id,
    result3.id,
  );
  TestValidator.notEquals(
    "moderator 1 and 3 have different IDs",
    result1.id,
    result3.id,
  );

  // Verify tokens are unique per account
  TestValidator.notEquals(
    "moderator 1 and 2 have different access tokens",
    result1.token.access,
    result2.token.access,
  );
  TestValidator.notEquals(
    "moderator 2 and 3 have different access tokens",
    result2.token.access,
    result3.token.access,
  );
  TestValidator.notEquals(
    "moderator 1 and 3 have different access tokens",
    result1.token.access,
    result3.token.access,
  );
  TestValidator.notEquals(
    "moderator 1 and 2 have different refresh tokens",
    result1.token.refresh,
    result2.token.refresh,
  );
  TestValidator.notEquals(
    "moderator 2 and 3 have different refresh tokens",
    result2.token.refresh,
    result3.token.refresh,
  );
  TestValidator.notEquals(
    "moderator 1 and 3 have different refresh tokens",
    result1.token.refresh,
    result3.token.refresh,
  );
}
