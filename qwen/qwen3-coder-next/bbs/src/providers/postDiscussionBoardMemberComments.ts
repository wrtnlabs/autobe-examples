import { IDiscussionBoardArticleComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleComment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardMemberComments(props: {
  member: MemberPayload;
  body: IDiscussionBoardArticleComment.ICreate;
}): Promise<IDiscussionBoardArticleComment> {
  const created = await MyGlobal.prisma.discussion_board_comments.create({
    data: {
      id: v4(),
      content: props.body.content,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      discussion_board_member_id: props.member.id,
      discussion_board_article_id: "",
    } satisfies Prisma.discussion_board_commentsCreateInput,
    select: {
      id: true,
      content: true,
      discussion_board_member_id: true,
      discussion_board_article_id: true,
      created_at: true,
      updated_at: true,
    },
  });
  return {
    id: created.id,
    content: created.content,
    author_id: created.discussion_board_member_id,
    article_id: created.discussion_board_article_id,
    created_at: created.created_at as string & tags.Format<"date-time">,
    updated_at: created.updated_at as string & tags.Format<"date-time">,
  };
}
