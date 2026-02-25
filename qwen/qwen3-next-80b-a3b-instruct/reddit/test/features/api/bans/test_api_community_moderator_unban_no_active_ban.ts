import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_unban_no_active_ban(
  connection: api.IConnection,
): Promise<void> {
  // Test unban behavior when no active ban exists for the target user
  // Authenticate as community moderator and attempt to unban a user
  // who has never been banned or whose ban has already been lifted.
  // System must return 404 Not Found to indicate the ban record does not exist or is not active.
  // This validates the API's response to invalid/unrelated deletion requests and ensures clients cannot infer the existence of users through error codes.
  // Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Authenticate as community moderator
  const moderator = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: (function () {
          let password = RandomGenerator.alphaNumeric(16);
          if (!/[0-9]/.test(password))
            password = password.replace(/[^0-9]/, "1");
          if (!/[!@#$%^&*]/.test(password))
            password = password.replace(/[^0-9a-zA-Z]/, "!");
          return password;
        })(),
        username: RandomGenerator.name(1),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // Extract community ID and create new connection with auth token
  const communityId = moderator.community.id;
  const authorizedConnection: api.IConnection = { host: connection.host };
  authorizedConnection.headers = {
    Authorization: `Bearer ${moderator.access_token}`,
  };
  // Generate a user ID who has never been banned
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to unban a user who has never been banned
  // System must return 404 Not Found
  await TestValidator.httpError("unban non-existent ban", 404, async () => {
    await api.functional.redditCommunity.communityModerator.communities.bans.erase(
      authorizedConnection, // Use authorized connection with auth token
      {
        communityId,
        userId,
      },
    );
  });
}
