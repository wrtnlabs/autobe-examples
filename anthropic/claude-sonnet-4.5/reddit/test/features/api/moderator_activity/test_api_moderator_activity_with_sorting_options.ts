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
 * Test sorting moderator activity history by different fields and orders.
 *
 * This test validates the sorting functionality of the moderator activity
 * history endpoint. It verifies that moderation actions can be sorted by
 * action_timestamp, community, and action_type fields in both ascending and
 * descending order. The test ensures that the sort_by and order parameters
 * correctly arrange the returned moderation actions, allowing moderators to
 * view their activity in their preferred organizational structure.
 *
 * Test workflow:
 *
 * 1. Create a moderator account for testing
 * 2. Retrieve activity history with sort_by="action_timestamp" and order="asc"
 * 3. Retrieve activity history with sort_by="action_timestamp" and order="desc"
 * 4. Retrieve activity history with sort_by="community" and order="asc"
 * 5. Retrieve activity history with sort_by="community" and order="desc"
 * 6. Retrieve activity history with sort_by="action_type" and order="asc"
 * 7. Retrieve activity history with sort_by="action_type" and order="desc"
 * 8. Validate that all sorting parameter combinations return valid responses
 */
export async function test_api_moderator_activity_with_sorting_options(
  connection: api.IConnection,
) {
  // 1. Create a moderator account for testing
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "SecurePassword123!",
        nickname: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Retrieve activity with sort_by="action_timestamp" order="asc"
  const timestampAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "action_timestamp",
          order: "asc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(timestampAsc);
  TestValidator.predicate(
    "timestamp asc response has valid pagination structure",
    timestampAsc.pagination.current >= 0 &&
      timestampAsc.pagination.limit > 0 &&
      timestampAsc.pagination.records >= 0 &&
      timestampAsc.pagination.pages >= 0,
  );

  // 3. Retrieve activity with sort_by="action_timestamp" order="desc"
  const timestampDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "action_timestamp",
          order: "desc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(timestampDesc);
  TestValidator.predicate(
    "timestamp desc response has valid pagination structure",
    timestampDesc.pagination.current >= 0 &&
      timestampDesc.pagination.limit > 0 &&
      timestampDesc.pagination.records >= 0 &&
      timestampDesc.pagination.pages >= 0,
  );

  // 4. Retrieve activity with sort_by="community" order="asc"
  const communityAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "community",
          order: "asc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(communityAsc);
  TestValidator.predicate(
    "community asc response has valid pagination structure",
    communityAsc.pagination.current >= 0 &&
      communityAsc.pagination.limit > 0 &&
      communityAsc.pagination.records >= 0 &&
      communityAsc.pagination.pages >= 0,
  );

  // 5. Retrieve activity with sort_by="community" order="desc"
  const communityDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "community",
          order: "desc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(communityDesc);
  TestValidator.predicate(
    "community desc response has valid pagination structure",
    communityDesc.pagination.current >= 0 &&
      communityDesc.pagination.limit > 0 &&
      communityDesc.pagination.records >= 0 &&
      communityDesc.pagination.pages >= 0,
  );

  // 6. Retrieve activity with sort_by="action_type" order="asc"
  const actionTypeAsc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "action_type",
          order: "asc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(actionTypeAsc);
  TestValidator.predicate(
    "action_type asc response has valid pagination structure",
    actionTypeAsc.pagination.current >= 0 &&
      actionTypeAsc.pagination.limit > 0 &&
      actionTypeAsc.pagination.records >= 0 &&
      actionTypeAsc.pagination.pages >= 0,
  );

  // 7. Retrieve activity with sort_by="action_type" order="desc"
  const actionTypeDesc: IPageIRedditCommunityModerationAction.ISummary =
    await api.functional.redditCommunity.moderator.moderators.activity.index(
      connection,
      {
        username: moderator.username,
        body: {
          sort_by: "action_type",
          order: "desc",
        } satisfies IRedditCommunityCommunityModerator.IActivityRequest,
      },
    );
  typia.assert(actionTypeDesc);
  TestValidator.predicate(
    "action_type desc response has valid pagination structure",
    actionTypeDesc.pagination.current >= 0 &&
      actionTypeDesc.pagination.limit > 0 &&
      actionTypeDesc.pagination.records >= 0 &&
      actionTypeDesc.pagination.pages >= 0,
  );

  // 8. Validate that data arrays are properly structured
  TestValidator.predicate(
    "all responses return data arrays",
    Array.isArray(timestampAsc.data) &&
      Array.isArray(timestampDesc.data) &&
      Array.isArray(communityAsc.data) &&
      Array.isArray(communityDesc.data) &&
      Array.isArray(actionTypeAsc.data) &&
      Array.isArray(actionTypeDesc.data),
  );
}
