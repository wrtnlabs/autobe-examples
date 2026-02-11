import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunityVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_posts_votes_create } from "../../../generate/generate_random_community_member_posts_votes_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_vote } from "../../../prepare/prepare_random_community_vote";

export async function test_api_vote_up_after_post_creation(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<50>>(),
    },
  });
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  const post = await api.functional.community.member.communities.posts.create(
    memberConnection,
    {
      communityId: community.id,
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "text",
        content: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  const vote = await generate_random_community_member_posts_votes_create(
    memberConnection,
    {
      body: { type: "up" } satisfies ICommunityVote.ICreate,
      params: { postId: post.id },
    },
  );
  typia.assert(vote);
  TestValidator.equals("vote type should be 'up'", vote.type, "up");
}
