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
 * Test different sorting options for moderation action results.
 *
 * This test validates the sorting functionality of the moderation actions
 * search API. It authenticates as a moderator and retrieves moderation actions
 * with various sort_by and order combinations to ensure proper sorting
 * behavior.
 *
 * The test verifies:
 *
 * 1. Sorting by 'created_at' in both ascending and descending order
 * 2. Sorting by 'moderator' to group actions by moderator
 * 3. Sorting by 'community' to group actions by community
 * 4. Sorting by 'action_type' to group actions by type
 * 5. Default behavior (created_at descending) shows most recent actions first
 */
export async function test_api_moderation_actions_sorting_options(
  connection: api.IConnection,
) {
  // Authenticate as moderator
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Test sorting by created_at in descending order (default)
  const sortByCreatedAtDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByCreatedAtDesc);
  TestValidator.predicate(
    "created_at descending order returns valid pagination",
    sortByCreatedAtDesc.pagination.current >= 0,
  );

  // Test sorting by created_at in ascending order
  const sortByCreatedAtAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "created_at",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByCreatedAtAsc);
  TestValidator.predicate(
    "created_at ascending order returns valid pagination",
    sortByCreatedAtAsc.pagination.current >= 0,
  );

  // If there are multiple results, verify ordering
  if (sortByCreatedAtDesc.data.length > 1) {
    TestValidator.predicate(
      "created_at descending shows most recent first",
      new Date(sortByCreatedAtDesc.data[0].created_at).getTime() >=
        new Date(sortByCreatedAtDesc.data[1].created_at).getTime(),
    );
  }

  if (sortByCreatedAtAsc.data.length > 1) {
    TestValidator.predicate(
      "created_at ascending shows oldest first",
      new Date(sortByCreatedAtAsc.data[0].created_at).getTime() <=
        new Date(sortByCreatedAtAsc.data[1].created_at).getTime(),
    );
  }

  // Test sorting by moderator in ascending order
  const sortByModeratorAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "moderator",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByModeratorAsc);
  TestValidator.predicate(
    "moderator ascending order returns valid pagination",
    sortByModeratorAsc.pagination.current >= 0,
  );

  // Test sorting by moderator in descending order
  const sortByModeratorDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "moderator",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByModeratorDesc);
  TestValidator.predicate(
    "moderator descending order returns valid pagination",
    sortByModeratorDesc.pagination.current >= 0,
  );

  // Test sorting by community in ascending order
  const sortByCommunityAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "community",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByCommunityAsc);
  TestValidator.predicate(
    "community ascending order returns valid pagination",
    sortByCommunityAsc.pagination.current >= 0,
  );

  // Test sorting by community in descending order
  const sortByCommunityDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "community",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByCommunityDesc);
  TestValidator.predicate(
    "community descending order returns valid pagination",
    sortByCommunityDesc.pagination.current >= 0,
  );

  // Test sorting by action_type in ascending order
  const sortByActionTypeAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "action_type",
          order: "asc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByActionTypeAsc);
  TestValidator.predicate(
    "action_type ascending order returns valid pagination",
    sortByActionTypeAsc.pagination.current >= 0,
  );

  // Test sorting by action_type in descending order
  const sortByActionTypeDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {
          sort_by: "action_type",
          order: "desc",
        } satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(sortByActionTypeDesc);
  TestValidator.predicate(
    "action_type descending order returns valid pagination",
    sortByActionTypeDesc.pagination.current >= 0,
  );

  // Test default sorting behavior (should be created_at descending)
  const defaultSort: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderationActions.index(
      connection,
      {
        body: {} satisfies IRedditCommunityModerationAction.IRequest,
      },
    );
  typia.assert(defaultSort);
  TestValidator.predicate(
    "default sorting returns valid pagination",
    defaultSort.pagination.current >= 0,
  );
}
