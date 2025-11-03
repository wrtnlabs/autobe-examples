import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberDiscussionBoardArticlesArticleIdDiscussionBoardAttachments(props: {
  member: MemberPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.ICreate;
}): Promise<IDiscussionBoardAttachment> {
  // Authorization & existence check: find article by ID where deleted_at is null
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });
  if (!article) {
    throw new HttpException("Article not found or deleted", 404);
  }

  // Create new attachment associated with the article
  const now = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.discussion_board_attachments.create({
    data: {
      id: v4(),
      discussion_board_article_id: props.articleId,
      filename: props.body.filename,
      file_type: props.body.file_type,
      file_url: props.body.file_url,
      created_at: now,
      updated_at: now,
      // deleted_at: not set, null by default
    },
  });

  // Return created attachment with properly typed fields
  return {
    id: created.id,
    discussion_board_article_id: created.discussion_board_article_id,
    filename: created.filename,
    file_type: created.file_type,
    file_url: created.file_url,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at:
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at),
  };
}
