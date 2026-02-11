import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityModerationActionOfPost";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityModerationActionOfPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityModerationActionOfPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_moderation_actions_filter_by_type_and_time(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderator);
  // Update connection with auth token
  moderatorConnection.headers = {
    Authorization: `Bearer ${moderator.access_token}`,
  };
  // 2. Calculate 24 hours ago
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  // 3. Call API to get moderation actions with filter for 'delete' and last 24 hours
  const response =
    await api.functional.redditCommunity.communityModerator.moderation_actions.index(
      moderatorConnection,
      {
        body: {
          action_type: "delete",
          created_at_after: twentyFourHoursAgo.toISOString(),
          limit: 100,
          cursor: "",
        } satisfies IRedditCommunityModerationActionOfPost.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals("pagination info present", response.pagination, {
    current: 1,
    limit: 100,
    records: response.data.length,
    pages: Math.ceil(response.data.length / 100),
  });
  // 5. Validate content: should only contain delete actions within last 24 hours
  const filteredActions = response.data;
  // Verify at least one result was returned (test data should exist)
  TestValidator.predicate(
    "at least one delete action found",
    () => filteredActions.length > 0,
  );
  // Verify all returned actions are delete actions
  TestValidator.predicate("all actions are delete", () =>
    filteredActions.every((action) => action.action_type === "delete"),
  );
  // Verify all actions are created within the last 24 hours
  TestValidator.predicate("all actions created within last 24 hours", () =>
    filteredActions.every(
      (action) => new Date(action.created_at) >= twentyFourHoursAgo,
    ),
  );
  // Verify none of the other action types are present
  TestValidator.predicate(
    "no ban actions present",
    () => !filteredActions.some((action) => action.action_type === "ban"),
  );
  TestValidator.predicate(
    "no approve actions present",
    () => !filteredActions.some((action) => action.action_type === "approve"),
  );
  TestValidator.predicate(
    "no dismiss actions present",
    () => !filteredActions.some((action) => action.action_type === "dismiss"),
  );
}