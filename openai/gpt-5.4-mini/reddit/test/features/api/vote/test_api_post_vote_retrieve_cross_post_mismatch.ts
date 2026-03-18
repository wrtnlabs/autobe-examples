import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_vote } from "../../../prepare/prepare_random_community_platform_vote";

export async function test_api_post_vote_retrieve_cross_post_mismatch(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234abcd!",
      username: RandomGenerator.alphabets(10),
      displayName: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatarImageUri: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(3),
        contentType: "text",
        text: { body: true },
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const vote =
    await generate_random_community_platform_member_posts_vote_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          direction: 1,
        } satisfies ICommunityPlatformVote.ICreate,
      },
    );
  typia.assert(vote);
  const retrieved =
    await api.functional.communityPlatform.member.posts.votes.at(
      memberConnection,
      {
        postId: post.id,
        voteId: vote.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "vote id matches on correct post scope",
    retrieved.id,
    vote.id,
  );
  TestValidator.equals(
    "vote member matches on correct post scope",
    retrieved.communityPlatformMemberId,
    vote.communityPlatformMemberId,
  );
  TestValidator.equals(
    "vote direction matches on correct post scope",
    retrieved.direction,
    vote.direction,
  );
  const otherCommunity =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconImageUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(otherCommunity);
  const otherPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          community_id: otherCommunity.id,
          title: RandomGenerator.name(3),
          contentType: "text",
          text: { body: true },
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(otherPost);
  await TestValidator.httpError(
    "vote retrieval should be scoped to the owning post",
    [400, 404],
    async () => {
      await api.functional.communityPlatform.member.posts.votes.at(
        memberConnection,
        {
          postId: otherPost.id,
          voteId: vote.id,
        },
      );
    },
  );
}
