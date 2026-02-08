import { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RegistereduserPayload } from "../decorators/payload/RegistereduserPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardRegisteredUserArticlesArticleIdFiles(props: {
  registeredUser: RegistereduserPayload;
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleFile.IRequest;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: props.articleId, deleted_at: null },
    select: { id: true, registered_user_id: true },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  // Authorization: only the author can update files. Admin check should be done elsewhere if needed.
  if (article.registered_user_id !== props.registeredUser.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Base query conditions
  const whereCondition = { article_id: props.articleId, deleted_at: null };
  // Pagination params - removed usage of props.body.page and props.body.limit because they do not exist
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Use transaction for potential update operations to ensure consistency
  return await MyGlobal.prisma.$transaction(async (tx) => {
    // Fetch files by pagination
    const files = await tx.discussion_board_article_files.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
    });
    // Count total files
    const total = await tx.discussion_board_article_files.count({
      where: whereCondition,
    });
    // Map to IDiscussionBoardArticleFile.ISummary
    const data = files.map((file) => ({
      id: file.id as string & tags.Format<"uuid">,
      article_id: file.article_id as string & tags.Format<"uuid">,
      file_name: file.file_name,
      file_type: file.file_type,
      file_size: file.file_size,
      download_url: file.download_url,
      display_order: file.display_order,
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
      deleted_at: file.deleted_at ? toISOStringSafe(file.deleted_at) : null,
    }));
    return {
      data,
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
    };
  });
}
