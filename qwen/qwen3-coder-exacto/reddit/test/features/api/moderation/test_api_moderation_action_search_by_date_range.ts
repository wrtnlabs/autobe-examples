import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityForumAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumAuthorizationToken";
import type { ICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerationAction";
import type { ICommunityForumCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityModerator";
import type { ICommunityForumCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityForumCommunityUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityForumCommunityModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityForumCommunityModerationAction";

export async function test_api_moderation_action_search_by_date_range(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator to perform search operations
  const moderatorJoinData = {
    community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderatorAuth: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinData,
    });
  typia.assert(moderatorAuth);

  // Step 2: Search for moderation actions within a specific date range
  const startDate = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 2 days ago
  const endDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // 2 days from now

  const searchRequest: ICommunityForumCommunityModerationAction.IRequest = {
    created_at_range: {
      from: startDate,
      to: endDate,
    },
  };

  const searchResult: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(searchResult);

  // Step 3: Test with updated_at range as well
  const updatedAtSearchRequest: ICommunityForumCommunityModerationAction.IRequest =
    {
      updated_at_range: {
        from: startDate,
        to: endDate,
      },
    };

  const updatedAtSearchResult: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: updatedAtSearchRequest,
      },
    );
  typia.assert(updatedAtSearchResult);

  // Step 4: Test with both created_at and updated_at ranges
  const combinedSearchRequest: ICommunityForumCommunityModerationAction.IRequest =
    {
      created_at_range: {
        from: startDate,
        to: endDate,
      },
      updated_at_range: {
        from: startDate,
        to: endDate,
      },
    };

  const combinedSearchResult: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: combinedSearchRequest,
      },
    );
  typia.assert(combinedSearchResult);

  // Step 5: Test with no results (search for actions in distant future)
  const noResultsSearchRequest: ICommunityForumCommunityModerationAction.IRequest =
    {
      created_at_range: {
        from: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days in future
        to: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString(), // 40 days in future
      },
    };

  const noResults: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: noResultsSearchRequest,
      },
    );
  typia.assert(noResults);

  TestValidator.equals(
    "no results should be returned for distant future date range",
    noResults.data.length,
    0,
  );
}
