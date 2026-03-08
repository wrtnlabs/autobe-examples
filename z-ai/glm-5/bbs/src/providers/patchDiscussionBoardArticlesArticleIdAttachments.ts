import { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardArticleAttachmentAtSummaryTransformer } from "../transformers/DiscussionBoardArticleAttachmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardArticlesArticleIdAttachments(props: {
  articleId: string & tags.Format<"uuid">;
  body: IDiscussionBoardArticleAttachment.IRequest;
}): Promise<IPageIDiscussionBoardArticleAttachment.ISummary> {
  // Verify article exists and not soft-deleted
  await MyGlobal.prisma.discussion_board_articles.findFirstOrThrow({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause for attachments
  const whereInput = {
    discussion_board_article_id: props.articleId,
    ...(props.body.type !== undefined && { type: props.body.type }),
  } satisfies Prisma.discussion_board_article_attachmentsWhereInput;
  // Query attachments with pagination
  const attachments =
    await MyGlobal.prisma.discussion_board_article_attachments.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...DiscussionBoardArticleAttachmentAtSummaryTransformer.select(),
    });
  // Count total for pagination
  const total =
    await MyGlobal.prisma.discussion_board_article_attachments.count({
      where: whereInput,
    });
  // Transform results using transformer
  const data = await ArrayUtil.asyncMap(
    attachments,
    DiscussionBoardArticleAttachmentAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIDiscussionBoardArticleAttachment.ISummary;
}
