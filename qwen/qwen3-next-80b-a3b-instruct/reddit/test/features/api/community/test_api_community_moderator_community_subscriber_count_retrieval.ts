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

export async function test_api_community_moderator_community_subscriber_count_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate a community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorInfo = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorInfo);
  // Generate a random community UUID (assume it exists in the test database)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve community subscriber count
  const community =
    await api.functional.redditCommunity.communityModerator.communities.at(
      moderatorConnection,
      {
        id: communityId,
      },
    );
  typia.assert(community);
  // Validate the response
  TestValidator.equals("community id matches", community.id, communityId);
  TestValidator.predicate(
    "subscriber count is a non-negative integer",
    community.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "created_at is a valid date-time format",
    new Date(community.created_at).toISOString() === community.created_at,
  );
}
