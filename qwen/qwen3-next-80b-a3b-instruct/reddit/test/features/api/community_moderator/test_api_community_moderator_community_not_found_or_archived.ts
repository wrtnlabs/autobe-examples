import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_community_not_found_or_archived(
  connection: api.IConnection,
): Promise<void> {
  // Create a moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Register a new moderator (required to access the endpoint)
  await authorize_community_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Generate a random UUID that does not exist
  const nonExistentCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve a non-existent community
  // This should return 404 Not Found, confirming the endpoint correctly hides archived/non-existent communities
  await TestValidator.httpError(
    "community not found or archived",
    404,
    async () => {
      await api.functional.redditCommunity.communityModerator.communities.at(
        moderatorConnection,
        {
          id: nonExistentCommunityId,
        },
      );
    },
  );
}
