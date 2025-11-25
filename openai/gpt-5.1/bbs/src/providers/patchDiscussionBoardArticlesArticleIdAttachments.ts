import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  const requestedPage = props.body.page ?? 1;
  const requestedLimit = props.body.limit ?? 20;

  const safePage = requestedPage < 1 ? 1 : requestedPage;
  const safeLimit = requestedLimit < 0 ? 0 : requestedLimit;

  const skip = safeLimit > 0 ? (safePage - 1) * safeLimit : 0;
  const take = safeLimit > 0 ? safeLimit : undefined;

  const sortField = props.body.sortField;
  const sortOrder = props.body.sortOrder;

  const effectiveSortField = (() => {
    if (
      sortField === "fileName" ||
      sortField === "fileSize" ||
      sortField === "uploadedAt"
    ) {
      return sortField;
    }
    return "uploadedAt";
  })();

  const effectiveSortOrder: "asc" | "desc" = (() => {
    if (sortOrder === "asc" || sortOrder === "ASC") return "asc";
    if (sortOrder === "desc" || sortOrder === "DESC") return "desc";
    return "desc";
  })();

  const orderBy = (() => {
    if (effectiveSortField === "fileName") {
      return { file_name: effectiveSortOrder } as const;
    }
    if (effectiveSortField === "fileSize") {
      return { file_size: effectiveSortOrder } as const;
    }
    // Default: uploadedAt
    return { created_at: effectiveSortOrder } as const;
  })();

  const whereBase = {
    article_id: props.articleId,
    deleted_at: null,
  } as const;

  const whereWithExtension = props.body.fileExtension
    ? { ...whereBase, file_extension: props.body.fileExtension }
    : whereBase;

  const where = props.body.contentType
    ? { ...whereWithExtension, content_type: props.body.contentType }
    : whereWithExtension;

  const [rows, totalCount] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where,
      skip,
      take,
      orderBy,
    }),
    MyGlobal.prisma.discussion_board_attachments.count({
      where,
    }),
  ]);

  const data = rows.map((row) => ({
    id: row.id,
    name: row.file_name,
    extension: (row as any).file_extension,
    size_bytes: row.file_size,
    url: row.file_uri,
    status: row.status,
  }));

  const currentPageIndex = safePage - 1;

  const pages =
    safeLimit > 0 && totalCount > 0 ? Math.ceil(totalCount / safeLimit) : 0;

  const pagination: IPage.IPagination = {
    current: currentPageIndex as number & tags.Type<"int32"> & tags.Minimum<0>,
    limit: safeLimit satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    pages: pages satisfies number as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
  };

  return {
    pagination,
    data,
  };
}
