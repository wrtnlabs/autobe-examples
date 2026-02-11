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

export async function test_api_moderation_actions_fetch_default(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityModerator.IJoin;
  const authResult = await authorize_community_moderator_join(
    moderatorConnection,
    { body: moderatorData },
  );
  typia.assert(authResult);
  // Use the authenticator's provided connection
  moderatorConnection.headers = {
    ...moderatorConnection.headers,
    Authorization: `Bearer ${authResult.access_token}`,
  };
  // Fetch moderation actions with default pagination (limit=10)
  const response =
    await api.functional.redditCommunity.communityModerator.moderation_actions.index(
      moderatorConnection,
      {
        body: {
          limit: 10,
          cursor: "", // Use empty string as initial cursor per common pagination practice
        },
      },
    );
  typia.assert(response);
  // Validate response structure
  TestValidator.equals(
    "response count matches limit",
    response.data.length,
    10,
  );
  TestValidator.equals("pagination limit is 10", response.pagination.limit, 10);
  TestValidator.equals(
    "pagination current is 1",
    response.pagination.current,
    1,
  );
  // Validate each moderation action has required fields
  for (const action of response.data) {
    TestValidator.equals(
      "action_type is valid",
      ["delete", "ban", "approve", "dismiss"].includes(action.action_type),
      true,
    );
    TestValidator.predicate(
      "reason is non-empty",
      () => action.reason.length > 0,
    );
    TestValidator.predicate(
      "actor_display_name is non-empty",
      () => action.actor_display_name.length > 0,
    );
    // Removed redundant typia.is check after typia.assert()
  }
  // Validate sorting - created_at should be in descending order
  for (let i = 0; i < response.data.length - 1; i++) {
    const current = new Date(response.data[i].created_at);
    const next = new Date(response.data[i + 1].created_at);
    TestValidator.predicate(
      "actions sorted by created_at descending",
      () => current >= next,
    );
  }
}
