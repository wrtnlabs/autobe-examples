import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_vote_repeat_same_direction_idempotent(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    },
  );
  typia.assert(post);
  TestValidator.equals(
    "new post starts with zero vote score",
    post.voteScore,
    0,
  );
  const voterConnection: api.IConnection = { host: connection.host };
  const voterAuth = await authorize_member_join(voterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(voterAuth);
  const voteBody = {
    direction: "upvote",
  } satisfies ICommunityPlatformPostVote.IUpdate;
  const firstVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      voterConnection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(firstVote);
  const secondVote =
    await api.functional.communityPlatform.member.posts.votes.update(
      voterConnection,
      {
        postId: post.id,
        body: voteBody,
      },
    );
  typia.assert(secondVote);
  TestValidator.equals(
    "first vote direction is upvote",
    firstVote.direction,
    voteBody.direction,
  );
  TestValidator.equals(
    "second vote direction is still upvote",
    secondVote.direction,
    voteBody.direction,
  );
  TestValidator.equals(
    "same vote record id reused",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "same voter member preserved",
    secondVote.member.id,
    firstVote.member.id,
  );
  TestValidator.equals(
    "same target post preserved",
    secondVote.post.id,
    firstVote.post.id,
  );
  TestValidator.equals(
    "post vote count unchanged on repeated identical vote",
    secondVote.post.vote_count,
    firstVote.post.vote_count,
  );
  TestValidator.equals(
    "first vote targets created post",
    firstVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "second vote targets created post",
    secondVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "voter connection member matches returned vote owner",
    firstVote.member.id,
    voterAuth.id,
  );
  TestValidator.equals(
    "repeated vote owner remains same authenticated member",
    secondVote.member.id,
    voterAuth.id,
  );
  TestValidator.predicate(
    "first vote applies visible positive score",
    firstVote.post.vote_count > 0,
  );
}
