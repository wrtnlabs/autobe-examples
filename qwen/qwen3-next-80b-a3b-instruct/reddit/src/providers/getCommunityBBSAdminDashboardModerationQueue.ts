import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityBBSReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ICommunityBBSReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSReport";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getCommunityBBSAdminDashboardModerationQueue(props: {
  admin: AdminPayload;
}): Promise<IPageICommunityBBSReport.ISummary> {
  const page = 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const [reports, total] = await Promise.all([
    MyGlobal.prisma.community_bbs_reports.findMany({
      where: {
        status: "pending",
        deleted_at: null,
        OR: [
          {
            targeted_entity_type: "post",
            community_bbs_reported_posts: {
              post: {
                deleted_at: null,
              },
            },
          },
          {
            targeted_entity_type: "comment",
            community_bbs_reported_comments: {
              comment: {
                deleted_at: null,
              },
            },
          },
        ],
      },
      include: {
        citizen: true,
        moderator: true,
        admin: true,
        reason: true,
        community_bbs_reported_posts: {
          include: {
            post: {
              select: {
                id: true,
                title: true,
                body: true,
                status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
        community_bbs_reported_comments: {
          include: {
            comment: {
              select: {
                id: true,
                body: true,
                business_status: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
          },
        },
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.community_bbs_reports.count({
      where: {
        status: "pending",
        deleted_at: null,
        OR: [
          {
            targeted_entity_type: "post",
            community_bbs_reported_posts: {
              post: {
                deleted_at: null,
              },
            },
          },
          {
            targeted_entity_type: "comment",
            community_bbs_reported_comments: {
              comment: {
                deleted_at: null,
              },
            },
          },
        ],
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: reports.map((report) => report.id),
  };
}
