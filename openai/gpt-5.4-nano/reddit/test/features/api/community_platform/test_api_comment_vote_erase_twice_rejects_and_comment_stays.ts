import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_comments_votes_create } from "../../../generate/generate_random_community_platform_member_posts_comments_votes_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_comment_vote } from "../../../prepare/prepare_random_community_platform_comment_vote";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_vote_erase_twice_rejects_and_comment_stays(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);

  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;

  const postId = (await api.functional.communityPlatform.member.posts.create(
    postConnection,
    {
      body: {
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text" satisfies string,
        title: RandomGenerator.name(),
        body_text: RandomGenerator.paragraph({ sentences: 2 }),
        link: {
          href: typia.random<string & tags.Format<"uri">>(),
          display_title: RandomGenerator.paragraph({ sentences: 1 })
            .replace(/\n/g, " ")
            .slice(0, 120),
          display_description: RandomGenerator.paragraph({ sentences: 1 })
            .replace(/\n/g, " ")
            .slice(0, 240),
        },
        image: {
          image_cover_url: typia.random<string & tags.Format<"uri">>(),
          image_alt_text: RandomGenerator.paragraph({ sentences: 1 })
            .replace(/\n/g, " ")
            .slice(0, 160),
          attachments: [
            typia.assert(typia.random<ICommunityPlatformPostImage.ICreate>()),
          ] satisfies ICommunityPlatformPostImage.ICreate[],
        } satisfies ICommunityPlatformPost.ICreate["image"],
      } satisfies ICommunityPlatformPost.ICreate,
    },
  )) as unknown as string;

  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      postConnection,
      {
        params: { postId: postId as any },
        body: {
          bodyText: RandomGenerator.paragraph({ sentences: 2 }),
          parentCommentId: undefined,
        } satisfies ICommunityPlatformPostVoteComment.ICreate,
      },
    );
  typia.assert(comment);

  const vote =
    await generate_random_community_platform_member_posts_comments_votes_create(
      postConnection,
      {
        params: { postId: postId as any, commentId: comment.id },
        body: {
          vote_direction: typia.random<number & tags.Type<"int32">>(),
        } satisfies ICommunityPlatformCommentVote.ICreate,
      },
    );
  typia.assert(vote);

  await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
    postConnection,
    {
      postId: postId as any,
      commentId: comment.id,
      voteId: vote.id,
    },
  );

  await TestValidator.error("second vote deletion should fail", async () => {
    await api.functional.communityPlatform.member.posts.comments.votes.eraseCommentVote(
      postConnection,
      {
        postId: postId as any,
        commentId: comment.id,
        voteId: vote.id,
      },
    );
  });

  await TestValidator.error("vote should be missing after deletion", async () => {
    const missingVote =
      await api.functional.communityPlatform.member.posts.comments.votes.at(
        postConnection,
        {
          postId: postId as any,
          commentId: comment.id,
          voteId: vote.id,
        },
      );
    typia.assert(missingVote);
  });

  const fetchedComment =
    await api.functional.communityPlatform.member.posts.comments.at(
      postConnection,
      {
        postId: postId as any,
        commentId: comment.id,
      },
    );
  typia.assert(fetchedComment);
  TestValidator.equals("comment id stays", fetchedComment.id, comment.id);
}
