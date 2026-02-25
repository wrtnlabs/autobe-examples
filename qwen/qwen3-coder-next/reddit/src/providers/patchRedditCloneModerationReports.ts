import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneModerationReport";
import { IRedditCloneModerationReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerationReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneModerationReports(props: {
  body: IRedditCloneModerationReport.IRequest;
}): Promise<IPageIRedditCloneModerationReport> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_clone_moderation_reportsWhereInput = {};
  if (props.body.status) {
    const statusMap: Record<string, string> = {
      pending: "pending",
      approved: "resolved_approved",
      dismissed: "resolved_dismissed",
    };
    where.status = statusMap[props.body.status];
  }
  if (props.body.content_type) {
    const typeMap: Record<string, string> = {
      post: "post",
      comment: "comment",
    };
    where.contentType = {
      code: typeMap[props.body.content_type],
    };
  }
  if (props.body.created_at_from || props.body.created_at_to) {
    where.created_at = {};
    if (props.body.created_at_from) {
      where.created_at.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      where.created_at.lte = props.body.created_at_to;
    }
  }
  if (props.body.search) {
    where.OR = [
      {
        reporter: {
          username: { contains: props.body.search, mode: "insensitive" },
        },
      },
      {
        reason_text: { contains: props.body.search, mode: "insensitive" },
      },
    ];
  }
  const reports =
    await MyGlobal.prisma.reddit_clone_moderation_reports.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      include: {
        reporter: { select: { username: true } },
        contentType: { select: { code: true } },
        contentPost: { select: { title: true } },
        contentComment: { select: { content: true } },
        moderator: { select: { username: true } },
      },
    });
  const total = await MyGlobal.prisma.reddit_clone_moderation_reports.count({
    where,
  });
  const data = reports.map((report) => {
    let contentPreview = "";
    if (report.contentPost) {
      contentPreview = report.contentPost.title;
    } else if (report.contentComment) {
      contentPreview = report.contentComment.content.substring(0, 200);
    }
    return {
      id: report.id,
      reporterUsername: report.reporter.username,
      contentType: report.contentType.code as "post" | "comment",
      contentPreview,
      reasonText: report.reason_text,
      status: report.status as
        | "pending"
        | "resolved_approved"
        | "resolved_dismissed",
      createdAt: toISOStringSafe(report.created_at),
      resolvedAt: report.resolved_at
        ? toISOStringSafe(report.resolved_at)
        : null,
      moderatorUsername: report.moderator?.username ?? null,
    } satisfies IRedditCloneModerationReport;
  });
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
