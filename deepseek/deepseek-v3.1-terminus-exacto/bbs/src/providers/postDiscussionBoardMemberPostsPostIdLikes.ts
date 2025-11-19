import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardPostLike } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPostLike";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberPostsPostIdLikes(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardPostLike.ICreate;
}): Promise<IDiscussionBoardPostLike> {
  // Validate that the authenticated member matches the body member_id
  if (props.member.id !== props.body.member_id) {
    throw new HttpException("Member ID mismatch", 403);
  }

  // Verify the post exists and is accessible
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.postId },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  // Check if post is published and accessible
  if (post.status !== "published" || post.deleted_at !== null) {
    throw new HttpException("Post is not accessible", 403);
  }

  // Check for existing like to prevent duplicates
  const existingLike =
    await MyGlobal.prisma.discussion_board_post_likes.findFirst({
      where: {
        discussion_board_member_id: props.body.member_id,
        discussion_board_post_id: props.postId,
        deleted_at: null,
      },
    });

  if (existingLike) {
    throw new HttpException("Post already liked by this member", 409);
  }

  // Verify the member exists
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.body.member_id },
  });

  if (!member || member.deleted_at !== null) {
    throw new HttpException("Member not found", 404);
  }

  const now = toISOStringSafe(new Date());

  // Create the like record
  const like = await MyGlobal.prisma.discussion_board_post_likes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: props.body.member_id,
      discussion_board_post_id: props.postId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      member: true,
      post: true,
    },
  });

  // Build member summary - use display_name or fallback to username or email
  const memberSummary: IDiscussionBoardMember.ISummary = {
    id: like.member.id,
    type: "member",
    name:
      like.member.display_name ||
      like.member.username ||
      like.member.email.split("@")[0],
  };

  // Build post summary
  const postSummary: IDiscussionBoardPost.ISummary = {
    id: like.post.id,
    type: "post",
    title: like.post.title,
  };

  return {
    id: like.id,
    member: memberSummary,
    post: postSummary,
    created_at: toISOStringSafe(like.created_at),
    updated_at: toISOStringSafe(like.updated_at),
    deleted_at: like.deleted_at ? toISOStringSafe(like.deleted_at) : undefined,
  };
}
