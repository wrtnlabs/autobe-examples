import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardDiscussionBoardPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardPost";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberDiscussionBoardPostsDiscussionBoardPostId(props: {
  member: MemberPayload;
  discussionBoardPostId: string & tags.Format<"uuid">;
  body: IDiscussionBoardDiscussionBoardPost.IUpdate;
}): Promise<IDiscussionBoardDiscussionBoardPost> {
  const { member, discussionBoardPostId, body } = props;

  const post = await MyGlobal.prisma.discussion_board_posts.findUniqueOrThrow({
    where: { id: discussionBoardPostId },
  });

  if (post.member_id !== member.id) {
    throw new HttpException(
      "Forbidden: You are not the owner of this post",
      403,
    );
  }

  const updated = await MyGlobal.prisma.discussion_board_posts.update({
    where: { id: discussionBoardPostId },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.body !== undefined && { body: body.body }),
      ...(body.post_status !== undefined && { post_status: body.post_status }),
    },
  });

  return {
    id: updated.id,
    category_id: updated.category_id,
    member_id: updated.member_id,
    title: updated.title,
    body: updated.body,
    post_status: updated.post_status,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
  };
}
