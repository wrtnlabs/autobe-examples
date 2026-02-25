import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPostText";
import type { IRedditComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditComment";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditMember";
import type { IRedditPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostText";
import type { IRedditPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_member_communities_create } from "../../../generate/generate_random_reddit_member_communities_create";
import { generate_random_reddit_member_communities_posts_create } from "../../../generate/generate_random_reddit_member_communities_posts_create";
import { prepare_random_reddit_community } from "../../../prepare/prepare_random_reddit_community";
import { prepare_random_reddit_post_text } from "../../../prepare/prepare_random_reddit_post_text";

export async function test_api_community_posts_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Auth as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      password: "1234",
    },
  });
  // 2. Create community
  const community = await generate_random_reddit_member_communities_create(
    memberConnection,
    {
      body: { name: RandomGenerator.name(2) },
    },
  );
  typia.assert(community);
  // 3. Create two posts
  const post1 = await generate_random_reddit_member_communities_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        content: "Post content 1",
      },
      params: { communityId: community.id },
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_member_communities_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        post_type: "text",
        content: "Post content 2",
      },
      params: { communityId: community.id },
    },
  );
  typia.assert(post2);
  // 4. Retrieve posts with hot sort
  const posts = await api.functional.reddit.member.communities.posts.index(
    memberConnection,
    {
      communityId: community.id,
      body: { sort: "hot" },
    },
  );
  typia.assert(posts);
  // 5. Verify hot sort order - newer post (post2) is first
  TestValidator.equals("hot sort order", posts.data[0].id, post2.id);
}
