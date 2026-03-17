import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
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
import { generate_random_community_platform_member_comments_votes_create } from "../../../generate/generate_random_community_platform_member_comments_votes_create";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_comment_vote_create_single_active_upvote(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const authorJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const authorAuth = await authorize_member_join(authorConnection, {
    body: authorJoinBody,
  });
  typia.assert(authorAuth);
  const voterConnection: api.IConnection = { host: connection.host };
  const voterJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformMember.IJoin;
  const voterAuth = await authorize_member_join(voterConnection, {
    body: voterJoinBody,
  });
  typia.assert(voterAuth);
  const communityBody = {
    slug: `community-${RandomGenerator.alphaNumeric(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: RandomGenerator.content({ paragraphs: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: postBody,
    },
  );
  typia.assert(post);
  const commentBody = {
    body: RandomGenerator.paragraph({ sentences: 4 }),
    parentId: null,
  } satisfies ICommunityPlatformComment.ICreate;
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: commentBody,
      },
    );
  typia.assert(comment);
  const voteBody = {
    direction: "upvote",
  } satisfies ICommunityPlatformCommentVote.ICreate;
  const vote =
    await generate_random_community_platform_member_comments_votes_create(
      voterConnection,
      {
        params: {
          commentId: typia.random<string & tags.Format<"uuid">>(),
        },
        body: voteBody,
      },
    );
  typia.assert(vote);
  TestValidator.equals(
    "requested direction is persisted",
    vote.direction,
    "upvote",
  );
  TestValidator.equals("vote is active", vote.deleted_at, null);
}
