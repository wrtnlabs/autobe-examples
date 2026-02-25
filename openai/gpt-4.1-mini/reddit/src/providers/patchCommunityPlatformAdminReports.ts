import { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
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

export async function patchCommunityPlatformAdminReports(props: {
  admin: AdminPayload;
  body: ICommunityPlatformReport.IRequest;
}): Promise<IPageICommunityPlatformReport.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  if (
    props.body.status !== undefined &&
    !["pending", "approved", "dismissed"].includes(props.body.status)
  ) {
    throw new HttpException("Invalid status filter", 400);
  }
  if (
    props.body.contentType !== undefined &&
    !["post", "comment"].includes(props.body.contentType)
  ) {
    throw new HttpException("Invalid contentType filter", 400);
  }
  const whereFilter = {
    status: props.body.status,
    community_platform_user_id: props.body.communityPlatformUserId,
    created_at: {
      ...(props.body.createdAtStart && { gte: props.body.createdAtStart }),
      ...(props.body.createdAtEnd && { lte: props.body.createdAtEnd }),
    },
  } satisfies Prisma.community_platform_reportsWhereInput;
  const data = await MyGlobal.prisma.community_platform_reports.findMany({
    where: {
      ...whereFilter,
      reportedContents: props.body.contentType
        ? {
            some:
              props.body.contentType === "post"
                ? {
                    community_platform_reported_post_id: { not: null },
                    deleted_at: null,
                  }
                : {
                    community_platform_reported_comment_id: { not: null },
                    deleted_at: null,
                  },
          }
        : undefined,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      description: true,
      status: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      user: {
        select: {
          id: true,
          email: true,
          username: true,
          display_name: true,
          bio: true,
          avatar_url: true,
          karma: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      reportReason: {
        select: {
          id: true,
          reason_text: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      _count: {
        select: { reportedContents: true },
      },
    },
  });
  const total = await MyGlobal.prisma.community_platform_reports.count({
    where: {
      ...whereFilter,
      reportedContents: props.body.contentType
        ? {
            some:
              props.body.contentType === "post"
                ? {
                    community_platform_reported_post_id: { not: null },
                    deleted_at: null,
                  }
                : {
                    community_platform_reported_comment_id: { not: null },
                    deleted_at: null,
                  },
          }
        : undefined,
      deleted_at: null,
    },
  });
  return {
    data: data.map((report) => ({
      id: report.id,
      description: report.description,
      status: report.status,
      user: {
        id: report.user.id,
        email: report.user.email,
        username: report.user.username,
        displayName: report.user.display_name,
        bio: report.user.bio ?? undefined,
        avatarUrl: report.user.avatar_url ?? undefined,
        karma: report.user.karma,
        createdAt: toISOStringSafe(report.user.created_at),
        updatedAt: toISOStringSafe(report.user.updated_at),
        deletedAt: report.user.deleted_at
          ? toISOStringSafe(report.user.deleted_at)
          : null,
      },
      reportReason: {
        id: report.reportReason.id,
        reasonText: report.reportReason.reason_text,
        createdAt: toISOStringSafe(report.reportReason.created_at),
        updatedAt: toISOStringSafe(report.reportReason.updated_at),
        deletedAt: report.reportReason.deleted_at
          ? toISOStringSafe(report.reportReason.deleted_at)
          : null,
      },
      reportedContents_count: report._count.reportedContents,
      created_at: toISOStringSafe(report.created_at),
      updated_at: toISOStringSafe(report.updated_at),
      deleted_at: report.deleted_at ? toISOStringSafe(report.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
