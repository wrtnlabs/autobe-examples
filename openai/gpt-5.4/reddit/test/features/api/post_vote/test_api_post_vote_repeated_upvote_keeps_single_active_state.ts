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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_votes_create } from "../../../generate/generate_random_community_platform_member_posts_votes_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_repeated_upvote_keeps_single_active_state(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {},
  );
  typia.assert(post);
  const initialVoteScore: number = post.voteScore;
  const upvoteDirection = "upvote";
  const firstVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          direction: upvoteDirection,
        },
      },
    );
  typia.assert(firstVote);
  TestValidator.equals(
    "first vote targets same post",
    firstVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "first vote direction is upvote",
    firstVote.direction,
    upvoteDirection,
  );
  const firstVoteScore: number = firstVote.post.vote_count;
  const secondVote =
    await generate_random_community_platform_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          direction: upvoteDirection,
        },
      },
    );
  typia.assert(secondVote);
  TestValidator.equals(
    "second vote targets same post",
    secondVote.post.id,
    post.id,
  );
  TestValidator.equals(
    "second vote direction remains upvote",
    secondVote.direction,
    upvoteDirection,
  );
  TestValidator.equals(
    "repeated upvote keeps same vote record id",
    secondVote.id,
    firstVote.id,
  );
  TestValidator.equals(
    "repeated upvote keeps same post relation",
    secondVote.post.id,
    firstVote.post.id,
  );
  TestValidator.equals(
    "repeated upvote keeps same member relation",
    secondVote.member.id,
    firstVote.member.id,
  );
  TestValidator.equals(
    "first upvote increases visible score by one",
    firstVoteScore,
    initialVoteScore + 1,
  );
  TestValidator.equals(
    "repeated upvote does not add another visible score point",
    secondVote.post.vote_count,
    firstVoteScore,
  );
}
