import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardComments(props: {
  member: MemberPayload;
  body: IDiscussionBoardComment.ICreate;
}): Promise<IDiscussionBoardComment> {
  const articleExists =
    await MyGlobal.prisma.discussion_board_articles.findUnique({
      where: { id: props.body.discussion_board_article_id },
      select: { id: true },
    });

  if (!articleExists) {
    throw new HttpException("Article not found", 404);
  }

  const now = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4(),
      content: props.body.content,
      discussion_board_article_id: props.body.discussion_board_article_id,
      discussion_board_member_id: props.member.id,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    include: {
      author: {
        select: {
          id: true,
          email: true,
          nickname: true,
        },
      },
    },
  });

  return {
    id: created.id,
    content: created.content,
    discussion_board_article_id: created.discussion_board_article_id,
    author: {
      id: created.author.id,
      email: created.author.email,
      nickname: created.author.nickname,
    },
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
