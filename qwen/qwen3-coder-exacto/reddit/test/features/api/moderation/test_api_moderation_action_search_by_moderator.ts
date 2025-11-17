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

export async function test_api_moderation_action_search_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to perform the search
  const moderatorJoinInput = {
    community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
  };

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderator);

  // Step 2: Create another moderator account to verify filtering works correctly
  const secondModeratorJoinInput = {
    community_forum_user_id: typia.random<string & tags.Format<"uuid">>(),
  };

  const secondModerator = await api.functional.auth.moderator.join(connection, {
    body: secondModeratorJoinInput,
  });
  typia.assert(secondModerator);

  // Step 3: Search for moderation actions by the first moderator
  const searchRequest = {
    community_forum_moderator_id: moderator.id,
  };

  const moderationActionsPage =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: searchRequest,
      },
    );
  typia.assert(moderationActionsPage);

  // Step 4: Validate that response structure is correct
  TestValidator.predicate(
    "pagination should exist",
    () => moderationActionsPage.pagination !== undefined,
  );

  TestValidator.predicate("data should be an array", () =>
    Array.isArray(moderationActionsPage.data),
  );

  // Step 5: Ensure all returned actions are from the specified moderator
  if (moderationActionsPage.data.length > 0) {
    TestValidator.predicate(
      "all actions should be from the specified moderator",
      () =>
        moderationActionsPage.data.every(
          (action) => action.community_forum_moderator_id === moderator.id,
        ),
    );
  }

  // Step 6: Search with a different moderator ID to confirm filtering works
  const secondSearchRequest = {
    community_forum_moderator_id: secondModerator.id,
  };

  const secondModerationActionsPage =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: secondSearchRequest,
      },
    );
  typia.assert(secondModerationActionsPage);

  // Step 7: Verify the second search returns actions from the correct moderator
  if (secondModerationActionsPage.data.length > 0) {
    TestValidator.predicate(
      "all actions in second search should be from the second moderator",
      () =>
        secondModerationActionsPage.data.every(
          (action) =>
            action.community_forum_moderator_id === secondModerator.id,
        ),
    );
  }

  // Step 8: Search without specifying a moderator (should return results from any moderator)
  const allActionsSearchRequest = {};

  const allActionsPage =
    await api.functional.communityForum.moderator.moderation_actions.index(
      connection,
      {
        body: allActionsSearchRequest,
      },
    );
  typia.assert(allActionsPage);

  // Step 9: Validate the pagination structure for all actions
  TestValidator.predicate(
    "pagination should exist for all actions search",
    () => allActionsPage.pagination !== undefined,
  );

  TestValidator.predicate(
    "data should be an array for all actions search",
    () => Array.isArray(allActionsPage.data),
  );
}
