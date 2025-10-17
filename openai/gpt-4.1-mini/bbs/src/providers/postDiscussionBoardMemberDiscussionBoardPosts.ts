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

export async function postDiscussionBoardMemberDiscussionBoardPosts(props: {
  member: MemberPayload;
  body: IDiscussionBoardDiscussionBoardPost.ICreate;
}): Promise<IDiscussionBoardDiscussionBoardPost> {
  const { member, body } = props;
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_posts.create({
    data: {
      id: v4(),
      category_id: body.category_id,
      member_id: member.id,
      title: body.title,
      body: body.body,
      post_status: body.post_status,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    category_id: created.category_id,
    member_id: created.member_id,
    title: created.title,
    body: created.body,
    post_status: created.post_status,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
