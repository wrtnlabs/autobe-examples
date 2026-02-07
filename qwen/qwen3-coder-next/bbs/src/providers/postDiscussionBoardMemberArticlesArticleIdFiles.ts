import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
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

export async function postDiscussionBoardMemberArticlesArticleIdFiles(props: {
  member: MemberPayload;
  articleId: string;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Validate article exists and user has permission
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId as string & tags.Format<"uuid"> },
    select: {
      id: true,
      author_id: true,
      section_id: true,
      deleted_at: true,
    },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  if (article.deleted_at !== null) {
    throw new HttpException("Article has been deleted", 404);
  }
  // Verify user has permission (member owns article or is admin)
  if (article.author_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Generate file metadata from system
  const fileId: string & tags.Format<"uuid"> = v4();
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());
  // Create file attachment record in database
  const created = await MyGlobal.prisma.discussion_board_article_files.create({
    data: {
      id: fileId,
      discussion_board_article_id: props.articleId as string &
        tags.Format<"uuid">,
      original_name: (props.body as any).originalName,
      stored_path: (props.body as any).storedPath,
      file_type: (props.body as any).fileType,
      file_size: (props.body as any).fileSize,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    select: {
      id: true,
      original_name: true,
      stored_path: true,
      file_type: true,
      file_size: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Return file attachment record
  return {
    id: created.id,
    original_name: created.original_name,
    stored_path: created.stored_path,
    file_type: created.file_type,
    file_size: created.file_size,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
