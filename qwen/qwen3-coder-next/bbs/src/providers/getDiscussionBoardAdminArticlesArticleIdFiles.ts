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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminArticlesArticleIdFiles(props: {
  admin: AdminPayload;
  articleId: string;
}): Promise<IPageIDiscussionBoardArticleFile.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;
  const files = await MyGlobal.prisma.discussion_board_article_files.findMany({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.discussion_board_article_files.count({
    where: {
      discussion_board_article_id: props.articleId,
      deleted_at: null,
    },
  });
  return {
    data: files.map((file) => ({
      id: file.id as string & tags.Format<"uuid">,
      article_id: file.discussion_board_article_id as string &
        tags.Format<"uuid">,
      original_name: file.original_name,
      stored_path: file.stored_path,
      file_type: file.file_type,
      file_size: file.file_size,
      created_at: toISOStringSafe(file.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(file.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at: file.deleted_at
        ? (toISOStringSafe(file.deleted_at) as string &
            tags.Format<"date-time">)
        : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
