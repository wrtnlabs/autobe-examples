import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformCommentEdit } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentEdit";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditPlatformCommentEditTransformer } from "../transformers/RedditPlatformCommentEditTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditPlatformMemberPostsPostIdCommentsCommentIdEditHistoriesEditId(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  commentId: string & tags.Format<"uuid">;
  editId: string & tags.Format<"uuid">;
}): Promise<IRedditPlatformCommentEdit> {
  // Step 1: Verify post exists and is not deleted
  const post = await MyGlobal.prisma.reddit_platform_posts.findUnique({
    where: { id: props.postId },
    select: { id: true, deleted_at: true, community_id: true },
  });
  if (post === null || post.deleted_at !== null) {
    throw new HttpException("Post not found", 404);
  }
  // Step 2: Verify comment exists, belongs to post, and check deletion status
  const comment = await MyGlobal.prisma.reddit_platform_comments.findFirst({
    where: {
      id: props.commentId,
      reddit_platform_post_id: props.postId,
    },
    select: {
      id: true,
      deleted_at: true,
      reddit_platform_member_id: true,
      reddit_platform_post_id: true,
    },
  });
  if (comment === null) {
    throw new HttpException("Comment not found", 404);
  }
  // Step 3: Check if comment is deleted
  const isCommentDeleted = comment.deleted_at !== null;
  // Step 4: Verify edit record exists and belongs to comment
  const edit = await MyGlobal.prisma.reddit_platform_comment_edits.findFirst({
    where: {
      id: props.editId,
      reddit_platform_comment_id: props.commentId,
    },
    select: {
      id: true,
      reddit_platform_comment_id: true,
      reddit_platform_member_id: true,
    },
  });
  if (edit === null) {
    throw new HttpException("Edit history not found", 404);
  }
  // Step 5: Authorization check
  const isCommentAuthor = comment.reddit_platform_member_id === props.member.id;
  // Check if member is a moderator of the community
  const isModerator =
    (await MyGlobal.prisma.reddit_platform_community_moderators.findFirst({
      where: {
        reddit_platform_community_id: post.community_id,
        reddit_platform_member_id: props.member.id,
      },
    })) !== null;
  // Regular members cannot access deleted comments
  if (isCommentDeleted && !isCommentAuthor && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 6: Retrieve edit record with member information using transformer
  const editWithRelations =
    await MyGlobal.prisma.reddit_platform_comment_edits.findUniqueOrThrow({
      where: { id: props.editId },
      ...RedditPlatformCommentEditTransformer.select(),
    });
  return await RedditPlatformCommentEditTransformer.transform(
    editWithRelations,
  );
}
