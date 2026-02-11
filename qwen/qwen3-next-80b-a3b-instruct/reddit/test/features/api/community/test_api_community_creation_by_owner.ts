import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";
import { generate_random_reddit_community_community_owner_communities_create } from "../../../generate/generate_random_reddit_community_community_owner_communities_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";

export async function test_api_community_creation_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate community owner
  const ownerConnection: api.IConnection = { host: connection.host, headers: {} };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 2. Log in to obtain access token
  const loginResult = await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  ownerConnection.headers = { Authorization: loginResult.token.access };
  // 3. Create new community with valid input
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({ sentences: 3 });
  const communityIcon = "https://example.com/icon.png";
  const community =
    await generate_random_reddit_community_community_owner_communities_create(
      ownerConnection,
      {
        body: {
          name: communityName,
          description: communityDescription,
          icon_url: communityIcon,
        },
      },
    );
  typia.assert(community);
  // 4. Validate community creation
  TestValidator.equals("community name matches", community.name, communityName);
  TestValidator.equals(
    "community description matches",
    community.description,
    communityDescription,
  );
  TestValidator.equals(
    "community icon URL matches",
    community.icon_url,
    communityIcon,
  );
  TestValidator.equals("subscriber count is 1", community.subscriber_count, 1);
  TestValidator.equals(
    "community owner's display name matches",
    community.owner.display_name,
    ownerEmail.split("@")[0],
  );
}