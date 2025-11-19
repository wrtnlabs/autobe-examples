import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardPost";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberPostsPostIdComments(props: {
  member: MemberPayload;
  postId: string & tags.Format<"uuid">;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  // Verify the post exists and is accessible
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: { id: props.postId, deleted_at: null },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  let threadLevel = 0;
  let parentComment = null;

  // Handle threaded replies
  if (props.body.parent_id) {
    parentComment = await MyGlobal.prisma.discussion_board_comments.findUnique({
      where: { id: props.body.parent_id, deleted_at: null },
    });

    if (!parentComment) {
      throw new HttpException("Parent comment not found", 404);
    }

    // Verify thread level doesn't exceed maximum depth
    if (parentComment.thread_level >= 2) {
      throw new HttpException("Maximum thread depth exceeded", 400);
    }

    threadLevel = parentComment.thread_level + 1;
  }

  // Fetch member details for author information
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: { id: props.member.id },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  const commentId = v4();
  const now = toISOStringSafe(new Date());

  // Create the comment
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: commentId,
      content: props.body.content,
      status: "published",
      thread_level: threadLevel,
      discussion_board_post_id: props.postId,
      discussion_board_member_id: props.member.id,
      parent_id: props.body.parent_id ?? null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Build post summary for response
  const postSummary: IDiscussionBoardPost.ISummary = {
    id: post.id,
    type: "post",
    title: post.title,
  };

  // Build author summary for response
  const authorSummary: IDiscussionBoardMember.ISummary = {
    id: member.id,
    type: "member",
    name: member.display_name || member.email || "Unknown Member",
  };

  return {
    id: created.id as string & tags.Format<"uuid">,
    content: created.content,
    status: created.status,
    thread_level: created.thread_level,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
    post: postSummary,
    author: authorSummary,
    parent_id: created.parent_id ?? undefined,
  };
}
