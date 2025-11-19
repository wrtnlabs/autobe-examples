import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function putDiscussionBoardMemberDiscussionBoardArticlesId(props: {
  member: MemberPayload;
  id: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticle.IUpdate;
}): Promise<IDiscussionBoardArticle> {
  const existing = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.id },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Article not found", 404);
  }

  if (existing.discussion_board_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }

  const now = new Date();
  const updated = await MyGlobal.prisma.discussion_board_articles.update({
    where: { id: props.id },
    data: {
      title: props.body.title !== undefined ? props.body.title : existing.title,
      content:
        props.body.content !== undefined
          ? props.body.content
          : existing.content,
      updated_at: now,
    },
  });

  return {
    id: updated.id,
    title: updated.title,
    content: updated.content,
    discussion_board_member_id: updated.discussion_board_member_id,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null ? null : toISOStringSafe(updated.deleted_at),
  };
}
