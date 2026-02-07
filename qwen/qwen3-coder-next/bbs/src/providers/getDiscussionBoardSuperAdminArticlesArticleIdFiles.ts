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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminArticlesArticleIdFiles(props: {
  superAdmin: SuperadminPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const page = 1; // Default page
  const limit = 100; // Default limit
  const skip = (page - 1) * limit;
  const data = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      original_name: true,
      file_type: true,
      file_size: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.discussion_board_article_files.count({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  return {
    data: data.map((file) => ({
      id: file.id,
      original_name: file.original_name,
      file_type: file.file_type,
      file_size: file.file_size,
      created_at: toISOStringSafe(file.created_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
