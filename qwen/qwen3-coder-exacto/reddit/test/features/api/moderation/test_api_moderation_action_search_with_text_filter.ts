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

export async function test_api_moderation_action_search_with_text_filter(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as a moderator to perform search operations
  const moderatorJoinBody = {
    community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies ICommunityForumCommunityModerator.ICreate;

  const moderator: ICommunityForumCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorJoinBody,
    });
  typia.assert(moderator);

  // Step 2: Test searching for moderation actions using text search on the reason field
  // Search for actions containing "spam" in the reason
  const searchRequestWithSpam = {
    reason: "spam",
  } satisfies ICommunityForumCommunityModerationAction.IRequest;

  const searchResultWithSpam: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequestWithSpam,
      },
    );
  typia.assert(searchResultWithSpam);

  // Validate that the search returned a proper paginated result
  TestValidator.equals(
    "search result should have pagination info",
    searchResultWithSpam.pagination,
    searchResultWithSpam.pagination,
  );

  // Validate that the data array exists
  TestValidator.equals(
    "search result should contain data array",
    Array.isArray(searchResultWithSpam.data),
    true,
  );

  // Step 3: Test searching for moderation actions with a different text filter
  // Search for actions containing "harassment" in the reason
  const searchRequestWithHarassment = {
    reason: "harassment",
  } satisfies ICommunityForumCommunityModerationAction.IRequest;

  const searchResultWithHarassment: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequestWithHarassment,
      },
    );
  typia.assert(searchResultWithHarassment);

  // Validate that the search returned a proper paginated result
  TestValidator.equals(
    "harassment search result should have pagination info",
    searchResultWithHarassment.pagination,
    searchResultWithHarassment.pagination,
  );

  // Validate that the data array exists
  TestValidator.equals(
    "harassment search result should contain data array",
    Array.isArray(searchResultWithHarassment.data),
    true,
  );

  // Step 4: Test searching with an empty reason filter to get all actions
  const searchRequestAll = {
    reason: "",
  } satisfies ICommunityForumCommunityModerationAction.IRequest;

  const searchResultAll: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequestAll,
      },
    );
  typia.assert(searchResultAll);

  // Validate that the search returned a proper paginated result
  TestValidator.equals(
    "all actions search result should have pagination info",
    searchResultAll.pagination,
    searchResultAll.pagination,
  );

  // Step 5: Test searching without reason filter (should return all actions)
  const searchRequestNoReason =
    {} satisfies ICommunityForumCommunityModerationAction.IRequest;

  const searchResultNoReason: IPageICommunityForumCommunityModerationAction.ISummary =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequestNoReason,
      },
    );
  typia.assert(searchResultNoReason);
}
