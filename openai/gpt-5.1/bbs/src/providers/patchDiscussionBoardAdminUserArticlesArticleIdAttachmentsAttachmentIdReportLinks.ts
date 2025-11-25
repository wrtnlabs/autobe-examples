import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function patchDiscussionBoardAdminUserArticlesArticleIdAttachmentsAttachmentIdReportLinks(props: {
  adminUser: AdminuserPayload;
  articleId: string;
  attachmentId: string;
  body: IDiscussionBoardReport.IRequest;
}): Promise<IPageIDiscussionBoardReport.ISummary> {
  // Authorization is handled by controller/AdminuserAuth; props.adminUser is trusted.

  // 1. Ensure the article exists and is not soft-deleted.
  const article = await MyGlobal.prisma.discussion_board_articles.findFirst({
    where: {
      id: props.articleId,
      deleted_at: null,
    },
  });

  if (article === null) {
    throw new HttpException("Article not found", 404);
  }

  // 2. Ensure the attachment exists, is not soft-deleted, and belongs to the article.
  const attachment =
    await MyGlobal.prisma.discussion_board_attachments.findFirst({
      where: {
        id: props.attachmentId,
        deleted_at: null,
      },
    });

  if (
    attachment === null ||
    attachment.discussion_board_article_id !== props.articleId
  ) {
    throw new HttpException("Attachment not found for article", 404);
  }

  // 3. Resolve pagination parameters (1-based page -> 0-based current in response).
  const pageInput = props.body.page !== undefined ? props.body.page : 1;
  const limitInput = props.body.limit !== undefined ? props.body.limit : 20;

  const safePage = pageInput < 1 ? 1 : pageInput;
  const maxLimit = 100;
  const safeLimit =
    limitInput < 1 ? 20 : limitInput > maxLimit ? maxLimit : limitInput;

  const skip = (safePage - 1) * safeLimit;
  const take = safeLimit;

  // 4. Build base where condition for reports linked to this attachment.
  const whereBase: Record<string, unknown> = {
    deleted_at: null,
    // For an attachment-scoped listing, default target_type to "attachment" when not provided.
    target_type:
      props.body.target_type !== undefined
        ? props.body.target_type
        : "attachment",
    reporter_type: props.body.reporter_type,
    status: props.body.status,
    discussion_board_report_of_attachments: {
      some: {
        discussion_board_attachment_id: props.attachmentId,
      },
    },
  };

  if (
    props.body.created_from !== undefined ||
    props.body.created_to !== undefined
  ) {
    const createdAtRange: Record<string, string> = {};
    if (props.body.created_from !== undefined) {
      createdAtRange.gte = props.body.created_from;
    }
    if (props.body.created_to !== undefined) {
      createdAtRange.lte = props.body.created_to;
    }
    whereBase.created_at = createdAtRange;
  }

  const where = whereBase;

  // 5. Determine ordering.
  const orderByField =
    props.body.order_by !== undefined ? props.body.order_by : "created_at";
  const orderDirection = props.body.order_direction === "asc" ? "asc" : "desc";

  // 6. Execute paginated query and total count.
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.discussion_board_reports.findMany({
      where,
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip,
      take,
    }),
    MyGlobal.prisma.discussion_board_reports.count({
      where,
    }),
  ]);

  // 7. Map database rows to ISummary DTOs, converting dates to ISO strings when necessary.
  const data: IDiscussionBoardReport.ISummary[] = rows.map((row) => {
    const createdAt =
      typeof row.created_at === "string"
        ? row.created_at
        : toISOStringSafe(row.created_at);
    const updatedAt =
      typeof row.updated_at === "string"
        ? row.updated_at
        : toISOStringSafe(row.updated_at);

    const summary: IDiscussionBoardReport.ISummary = {
      id: row.id,
      target_type: row.target_type,
      reporter_type: row.reporter_type,
      reason_code: row.reason_code,
      status: row.status,
      action: row.action,
      created_at: createdAt,
      updated_at: updatedAt,
    };

    return summary;
  });

  // 8. Build pagination metadata.
  const pages = safeLimit === 0 ? 0 : Math.ceil(total / safeLimit);

  const pagination: IPage.IPagination = {
    current: safePage - 1,
    limit: safeLimit,
    records: total,
    pages,
  };

  const result: IPageIDiscussionBoardReport.ISummary = {
    pagination,
    data,
  };

  return result;
}
