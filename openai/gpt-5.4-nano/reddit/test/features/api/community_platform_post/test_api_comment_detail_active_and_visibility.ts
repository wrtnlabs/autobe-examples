import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_vote_comment } from "../../../prepare/prepare_random_community_platform_post_vote_comment";

export async function test_api_comment_detail_active_and_visibility(
  connection: api.IConnection,
): Promise<void> {
  // 1) Register/authorize a member
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {});

  // 2) Create a post and obtain postId
  const createdPost = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {},
  );
  const postId = typia.assert<{ id: string }>(createdPost as any).id;

  // 3) Create a comment inside the post and obtain commentId
  const createdComment =
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
  typia.assert(createdComment);
  const commentId = createdComment.id;

  // 4) Fetch active comment detail
  const comment =
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      { postId, commentId },
    );
  typia.assert(comment);
  TestValidator.equals("comment id", comment.id, commentId);
  TestValidator.equals(
    "comment post id",
    comment.community_platform_post_id,
    postId,
  );
  TestValidator.equals("author id", comment.author_id, authorized.id);
  TestValidator.equals("deleted_at is null", comment.deleted_at, null);

  // 5) Edit comment and verify
  const oldUpdatedAt = comment.updated_at;
  const editedBodyText = RandomGenerator.paragraph({ sentences: 3 });
  const updated =
    await api.functional.communityPlatform.member.posts.comments.update(
      memberConnection,
      {
        postId,
        commentId,
        body: {
          bodyText: editedBodyText,
        } satisfies ICommunityPlatformComment.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("edited id stable", updated.id, commentId);
  TestValidator.equals(
    "edited comment post id stable",
    updated.community_platform_post_id,
    postId,
  );
  TestValidator.equals("edited body_text", updated.body_text, editedBodyText);
  TestValidator.notEquals(
    "updated_at changed",
    oldUpdatedAt,
    updated.updated_at,
  );

  // 6) Re-fetch detail after edit
  const commentAfterEdit =
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      { postId, commentId },
    );
  typia.assert(commentAfterEdit);
  TestValidator.equals(
    "detail body_text updated",
    commentAfterEdit.body_text,
    editedBodyText,
  );
  TestValidator.notEquals(
    "detail updated_at changed",
    oldUpdatedAt,
    commentAfterEdit.updated_at,
  );

  // 7) Soft-delete comment
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberConnection,
    { postId, commentId },
  );

  // 8) Fetch should behave as absent
  await TestValidator.error("deleted comment is not retrievable", async () => {
    await api.functional.communityPlatform.member.posts.comments.at(
      memberConnection,
      { postId, commentId },
    );
  });
}
