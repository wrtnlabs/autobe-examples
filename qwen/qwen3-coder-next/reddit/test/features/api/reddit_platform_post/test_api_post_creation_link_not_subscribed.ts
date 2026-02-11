import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_posts_create } from "../../../generate/generate_random_reddit_platform_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_creation_link_not_subscribed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A registration and login
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await api.functional.redditPlatform.auth.member.join(
    memberAConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberA);
  // Update connection with token
  memberAConnection.headers = {
    ...memberAConnection.headers,
    Authorization: memberA.token.access,
  };
  // 2. Member B registration and login
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await api.functional.redditPlatform.auth.member.join(
    memberBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
      } satisfies IRedditPlatformMember.IJoin,
    },
  );
  typia.assert(memberB);
  // Update connection with token
  memberBConnection.headers = {
    ...memberBConnection.headers,
    Authorization: memberB.token.access,
  };
  // 3. Member B creates a community (Member B subscribes automatically as owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberBConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Member A attempts to create a LINK post in the community they are NOT subscribed to
  // This should fail with a permission denied error
  const linkUrl = `https://${RandomGenerator.alphabets(6)}.example.com/${RandomGenerator.alphabets(8)}`;
  await TestValidator.error(
    "Member A cannot create LINK post in community they are not subscribed to",
    async () => {
      await api.functional.redditPlatform.posts.create(memberAConnection, {
        body: {
          communityId: community.id,
          title: RandomGenerator.paragraph({ sentences: 1 }),
          type: "LINK" as const,
          url: linkUrl satisfies string & tags.Format<"uri">,
        } satisfies IRedditPlatformPost.ICreate,
      });
    },
  );
}
