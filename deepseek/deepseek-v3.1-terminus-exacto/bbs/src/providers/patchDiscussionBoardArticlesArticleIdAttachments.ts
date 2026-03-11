import { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardAttachmentAtSummaryTransformer } from "../transformers/DiscussionBoardAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardAttachment.IRequest;
}): Promise<IPageIDiscussionBoardAttachment.ISummary> {
  // Validate article exists and is accessible
  await MyGlobal.prisma.discussion_board_articles.findUniqueOrThrow({
    where: { id: props.articleId, deleted_at: null },
  });
  // Build WHERE conditions
  const whereInput = {
    article_id: props.articleId,
    deleted_at: null,
    ...(props.body.search && {
      filename: { contains: props.body.search, mode: "insensitive" },
    }),
    ...(props.body.filetype && { filetype: props.body.filetype }),
    ...(props.body.mime_type && { mime_type: props.body.mime_type }),
    ...(props.body.size_min !== undefined && {
      size_bytes: { gte: props.body.size_min },
    }),
    ...(props.body.size_max !== undefined && {
      size_bytes:
        props.body.size_max !== undefined
          ? {
              ...(props.body.size_min !== undefined
                ? { gte: props.body.size_min }
                : {}),
              lte: props.body.size_max,
            }
          : {
              ...(props.body.size_min !== undefined
                ? { gte: props.body.size_min }
                : {}),
            },
    }),
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  } satisfies Prisma.discussion_board_attachmentsWhereInput;
  // Pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // Execute queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_attachments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...DiscussionBoardAttachmentAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.discussion_board_attachments.count({ where: whereInput }),
  ]);
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    DiscussionBoardAttachmentAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
