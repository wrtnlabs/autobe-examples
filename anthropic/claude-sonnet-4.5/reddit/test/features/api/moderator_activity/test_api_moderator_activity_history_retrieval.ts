import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationAction";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationAction";

/**
 * Test retrieving a moderator's complete activity history with default
 * pagination settings.
 *
 * This test validates that when a moderator is authenticated and requests their
 * own activity history without any filters, the system returns a properly
 * paginated list of all moderation actions they have performed.
 *
 * Steps:
 *
 * 1. Create and authenticate a new moderator account
 * 2. Retrieve the moderator's activity history with default pagination (no
 *    filters)
 * 3. Validate the response structure contains pagination metadata
 * 4. Validate the response contains an array of moderation action summaries
 * 5. Verify pagination metadata fields are present and valid
 */
export async function test_api_moderator_activity_history_retrieval(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Retrieve the moderator's activity history with default pagination
  const activityResponse: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {} satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(activityResponse);

  // Step 3: Validate the response structure contains pagination metadata
  TestValidator.predicate(
    "response should have pagination property",
    activityResponse.pagination !== null &&
      activityResponse.pagination !== undefined,
  );

  // Step 4: Validate the response contains an array of moderation action summaries
  TestValidator.predicate(
    "response should have data array",
    Array.isArray(activityResponse.data),
  );

  // Step 5: Verify pagination metadata fields are present and valid
  const pagination = activityResponse.pagination;

  TestValidator.predicate(
    "pagination current page should be non-negative",
    pagination.current >= 0,
  );

  TestValidator.predicate(
    "pagination limit should be positive",
    pagination.limit > 0,
  );

  TestValidator.predicate(
    "pagination records should be non-negative",
    pagination.records >= 0,
  );

  TestValidator.predicate(
    "pagination pages should be non-negative",
    pagination.pages >= 0,
  );
}
