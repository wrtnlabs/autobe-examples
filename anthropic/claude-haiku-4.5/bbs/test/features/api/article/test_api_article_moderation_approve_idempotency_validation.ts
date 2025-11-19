import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Validates moderator authentication and authorization for article approval
 * operations.
 *
 * This test ensures proper setup of moderator accounts with appropriate
 * permissions for content moderation. The test validates:
 *
 * 1. Moderator registration and authentication
 * 2. Proper account status initialization (active)
 * 3. Correct moderation tier assignment (full)
 * 4. JWT token generation for authenticated requests
 * 5. Moderator identity tracking for audit purposes
 *
 * Note: Full approval workflow testing requires article creation and retrieval
 * APIs which are not available in the current API specification. This test
 * validates the prerequisite authentication layer necessary for approval
 * operations.
 */
export async function test_api_article_moderation_approve_idempotency_validation(
  connection: api.IConnection,
) {
  // Step 1: Register first moderator account for approval testing
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "SecurePassword123!@";
  const moderator1Username = RandomGenerator.alphabets(12);

  const moderator1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: moderator1Password,
        username: moderator1Username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator1);

  // Validate moderator account initialization
  TestValidator.equals(
    "moderator account status is active",
    moderator1.account_status,
    "active",
  );
  TestValidator.equals(
    "moderator moderation tier is full",
    moderator1.moderation_tier,
    "full",
  );
  TestValidator.equals(
    "moderator email verification pending",
    moderator1.email_verified,
    false,
  );
  TestValidator.predicate(
    "moderator ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      moderator1.id,
    ),
  );
  TestValidator.predicate(
    "authorization token contains access token",
    moderator1.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization token contains refresh token",
    moderator1.token.refresh.length > 0,
  );

  // Step 2: Register second moderator to validate independent accounts
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = "AnotherPassword456!@";
  const moderator2Username = RandomGenerator.alphabets(12);

  const moderator2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: moderator2Password,
        username: moderator2Username,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator2);

  // Validate second moderator is separate account
  TestValidator.notEquals(
    "second moderator has different ID",
    moderator1.id,
    moderator2.id,
  );
  TestValidator.notEquals(
    "second moderator has different username",
    moderator1.username,
    moderator2.username,
  );
  TestValidator.notEquals(
    "second moderator has different email",
    moderator1.email,
    moderator2.email,
  );
  TestValidator.notEquals(
    "second moderator receives different access token",
    moderator1.token.access,
    moderator2.token.access,
  );

  // Step 3: Validate moderator metadata and timestamps
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderator1.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(moderator1.updated_at),
  );
  TestValidator.predicate(
    "token expiration is in future",
    new Date(moderator1.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token expiration is in future",
    new Date(moderator1.token.refreshable_until) > new Date(),
  );
}
