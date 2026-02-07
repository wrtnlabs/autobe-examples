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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardMemberArticlesArticleIdFiles(props: {
  member: MemberPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const { articleId } = props;
  const limit = 10;
  const page = 1;
  const skip = (page - 1) * limit;
  // First verify the article exists and is accessible
  const article = await MyGlobal.prisma.discussion_board_articles.findUnique({
    where: { id: articleId, deleted_at: null },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const data = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: {
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_article_files.count({
    where: {
      discussion_board_article_id: articleId,
      deleted_at: null,
    },
  });
  return {
    data: data.map((file) => ({
      id: file.id,
      original_name: file.original_name,
      stored_path: file.stored_path,
      file_type: file.file_type,
      file_size: file.file_size,
      created_at: toISOStringSafe(file.created_at),
      updated_at: toISOStringSafe(file.updated_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
