import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminArticlesArticleIdFiles(props: {
  admin: AdminPayload;
  articleId: string;
  body: IDiscussionBoardArticleFile.ICreate;
}): Promise<IDiscussionBoardArticleFile> {
  // Validate article exists
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) throw new HttpException("Article not found", 404);
  // Create file attachment with Prisma
  const file = await MyGlobal.prisma.discussion_board_article_files.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      original_name: "",
      stored_path: "",
      file_type: "",
      file_size: 0,
      created_at: new Date() as unknown as string & tags.Format<"date-time">,
      updated_at: new Date() as unknown as string & tags.Format<"date-time">,
      deleted_at: null as unknown as (string & tags.Format<"date-time">) | null,
      article: { connect: { id: props.articleId } },
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
  return {
    id: file.id as string & tags.Format<"uuid">,
    original_name: file.original_name,
    stored_path: file.stored_path,
    file_type: file.file_type,
    file_size: file.file_size,
    created_at: toISOStringSafe(file.created_at),
    updated_at: toISOStringSafe(file.updated_at),
    deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
  };
}
