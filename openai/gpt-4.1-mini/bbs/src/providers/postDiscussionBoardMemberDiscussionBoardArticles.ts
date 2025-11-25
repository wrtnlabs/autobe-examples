import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardArticles(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticle.ICreate;
}): Promise<IDiscussionBoardArticle> {
  function generateUuid(): string & tags.Format<"uuid"> {
    return v4();
  }

  const id = generateUuid();
  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_articles.create({
    data: {
      id: id,
      title: props.body.title,
      content: props.body.content,
      discussion_board_member_id: props.member.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id,
    title: created.title,
    content: created.content,
    discussion_board_member_id: created.discussion_board_member_id,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at !== null ? toISOStringSafe(created.deleted_at) : null,
  };
}
