import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
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

export async function postMembersMemberIdPostsPostIdLikes(props: {
  member: MemberPayload;
  memberId: string & tags.Format<"uuid">;
  postId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardPostLike> {
  // Validate that authenticated member matches the path memberId
  if (props.member.id !== props.memberId) {
    throw new HttpException(
      "You can only create likes for your own account",
      403,
    );
  }

  // Verify the member exists and is active
  const member = await MyGlobal.prisma.discussion_board_members.findUnique({
    where: {
      id: props.memberId,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      display_name: true,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  // Verify the post exists and is accessible
  const post = await MyGlobal.prisma.discussion_board_posts.findUnique({
    where: {
      id: props.postId,
      deleted_at: null,
    },
    select: {
      id: true,
      title: true,
      status: true,
    },
  });

  if (!post) {
    throw new HttpException("Post not found", 404);
  }

  if (post.status !== "published") {
    throw new HttpException("Post is not accessible", 403);
  }

  // Check if like already exists
  const existingLike =
    await MyGlobal.prisma.discussion_board_post_likes.findFirst({
      where: {
        discussion_board_member_id: props.memberId,
        discussion_board_post_id: props.postId,
        deleted_at: null,
      },
    });

  if (existingLike) {
    throw new HttpException("You have already liked this post", 409);
  }

  // Create the like record
  const now = new Date();
  const like = await MyGlobal.prisma.discussion_board_post_likes.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      discussion_board_member_id: props.memberId,
      discussion_board_post_id: props.postId,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Transform to the expected response format
  return {
    id: like.id,
    member: {
      id: member.id,
      type: "member",
      name: member.display_name || member.username,
    },
    post: {
      id: post.id,
      type: "post",
      title: post.title,
    },
    created_at: toISOStringSafe(like.created_at),
    updated_at: toISOStringSafe(like.updated_at),
    deleted_at: like.deleted_at ? toISOStringSafe(like.deleted_at) : undefined,
  };
}
