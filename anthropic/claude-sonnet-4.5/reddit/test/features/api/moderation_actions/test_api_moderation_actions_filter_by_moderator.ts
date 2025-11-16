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
 * Test filtering moderation actions by specific moderator ID.
 *
 * This test validates the moderator_id filter parameter functionality in the
 * moderation actions search endpoint. It creates multiple moderator accounts,
 * searches for moderation actions filtered by a specific moderator's UUID, and
 * verifies that the filter correctly isolates actions performed only by the
 * specified moderator.
 *
 * Test Flow:
 *
 * 1. Create and authenticate first moderator account
 * 2. Create and authenticate second moderator account
 * 3. Create and authenticate third moderator account
 * 4. Search moderation actions filtered by first moderator's ID
 * 5. Validate all returned actions match the specified moderator_id
 * 6. Search with second moderator's ID to verify different filtering
 * 7. Validate pagination metadata is correct
 */
export async function test_api_moderation_actions_filter_by_moderator(
  connection: api.IConnection,
) {
  // Create first moderator account
  const moderator1: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass123",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator1);

  // Create second moderator account
  const moderator2: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass456",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator2);

  // Create third moderator account for comprehensive testing
  const moderator3: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePass789",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator3);

  // Search moderation actions filtered by first moderator's ID
  const actionsForModerator1: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator1.id,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(actionsForModerator1);

  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page should be non-negative",
    actionsForModerator1.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit should be positive",
    actionsForModerator1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records should be non-negative",
    actionsForModerator1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages should be non-negative",
    actionsForModerator1.pagination.pages >= 0,
  );

  // Validate all returned actions belong to moderator1
  if (actionsForModerator1.data.length > 0) {
    for (const action of actionsForModerator1.data) {
      TestValidator.equals(
        "action should belong to moderator1",
        action.reddit_community_moderator_id,
        moderator1.id,
      );
    }
  }

  // Search moderation actions filtered by second moderator's ID
  const actionsForModerator2: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator2.id,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(actionsForModerator2);

  // Validate all returned actions belong to moderator2
  if (actionsForModerator2.data.length > 0) {
    for (const action of actionsForModerator2.data) {
      TestValidator.equals(
        "action should belong to moderator2",
        action.reddit_community_moderator_id,
        moderator2.id,
      );
    }
  }

  // Search moderation actions filtered by third moderator's ID
  const actionsForModerator3: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          moderator_id: moderator3.id,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(actionsForModerator3);

  // Validate all returned actions belong to moderator3
  if (actionsForModerator3.data.length > 0) {
    for (const action of actionsForModerator3.data) {
      TestValidator.equals(
        "action should belong to moderator3",
        action.reddit_community_moderator_id,
        moderator3.id,
      );
    }
  }

  // Search with null moderator_id to get all actions
  const allActions: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          moderator_id: null,
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(allActions);

  // Validate that filtering by moderator_id returns subset of all actions
  TestValidator.predicate(
    "filtered results should not exceed total results",
    actionsForModerator1.pagination.records <= allActions.pagination.records,
  );
}
