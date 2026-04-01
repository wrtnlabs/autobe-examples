import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_communities_icon_create } from "../../../generate/generate_random_reddit_community_member_communities_icon_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_community_icon } from "../../../prepare/prepare_random_reddit_community_community_icon";

export async function test_api_community_icon_retrieval_with_icon(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create a new community
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Upload an icon image to the community
  const iconUri = typia.random<string & tags.Format<"uri">>();
  const communityWithIcon =
    await generate_random_reddit_community_member_communities_icon_create(
      memberConnection,
      {
        body: {
          uri: iconUri,
        } satisfies IRedditCommunityCommunityIcon.ICreate,
        params: {
          communityName: community.name,
        },
      },
    );
  typia.assert(communityWithIcon);
  // 4. Retrieve the icon metadata
  const iconMetadata = await api.functional.redditCommunity.communities.icon.at(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  typia.assert(iconMetadata);
  // 5. Verify business logic: icon was actually created and retrievable
  TestValidator.notEquals("icon has valid id", iconMetadata.id, "");
  TestValidator.predicate(
    "storageUrl contains storage path",
    iconMetadata.storageUrl.includes("http"),
  );
  TestValidator.equals(
    "original filename preserved",
    iconMetadata.originalFilename,
    communityWithIcon.communityIcons[0]?.originalFilename,
  );
}
