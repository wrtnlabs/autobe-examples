import { IEconomicBoardFileAttachmentOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicBoardFileAttachmentOfAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicBoardFileAttachmentOfAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicBoardFileAttachmentOfAdministrator";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEconomicBoardArticlesArticleIdFiles(props: {
  articleId: string & tags.Format<"uuid">;
  page?: number;
  limit?: number;
}): Promise<IPageIEconomicBoardFileAttachmentOfAdministrator.ISummary> {
  const page = props.page ?? 1;
  const limit = props.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate article exists first
  const article = await MyGlobal.prisma.economic_board_articles.findUnique({
    where: { id: props.articleId },
  });
  if (!article) {
    throw new HttpException("Article not found", 404);
  }
  const files = await MyGlobal.prisma.economic_board_file_attachments.findMany({
    where: {
      actor_identifier: article.economic_board_citizen_id,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
    skip,
    take: limit,
    select: {
      id: true,
      file_name: true,
      file_size: true,
      mime_type: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.economic_board_file_attachments.count({
    where: {
      actor_identifier: article.economic_board_citizen_id,
      deleted_at: null,
    },
  });
  return {
    data: files.map((file) => ({
      id: file.id,
      file_name: file.file_name,
      file_size: file.file_size,
      mime_type: file.mime_type,
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
