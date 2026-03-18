import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostVoteComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_create_reply_same_post_success(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  await generate_random_community_platform_community_subscriptions_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const postCreationBody: ICommunityPlatformPost.ICreate = {
    community_id: community.id,
    post_type: "text",
    title: RandomGenerator.name(),
    body_text: RandomGenerator.content({
      paragraphs: 1,
      sentenceMin: 2,
      sentenceMax: 3,
      wordMin: 3,
      wordMax: 7,
    }),
  };
  await api.functional.communityPlatform.member.posts.create(memberConnection, {
    body: postCreationBody,
  });
  const postId = typia.random<string & tags.Format<"uuid">>();
  const parentComment: ICommunityPlatformPostVoteComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: null,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(parentComment);
  const replyComment: ICommunityPlatformPostVoteComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: parentComment.post.id },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: parentComment.id,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(replyComment);
  TestValidator.equals(
    "reply comment belongs to same post",
    replyComment.post.id,
    parentComment.post.id,
  );
  TestValidator.predicate(
    "reply comment has non-null parent",
    replyComment.parent !== null,
  );
  TestValidator.equals(
    "reply parent id matches parentCommentId used",
    replyComment.parent!.id,
    parentComment.id,
  );
  TestValidator.equals("reply deletedAt is null", replyComment.deletedAt, null);
}
