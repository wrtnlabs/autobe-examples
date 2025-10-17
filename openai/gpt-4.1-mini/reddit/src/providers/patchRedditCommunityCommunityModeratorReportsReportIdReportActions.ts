import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import { IPageIRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportAction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import { CommunitymoderatorPayload } from "../decorators/payload/CommunitymoderatorPayload";

export async function patchRedditCommunityCommunityModeratorReportsReportIdReportActions(props: {
  communityModerator: CommunitymoderatorPayload;
  reportId: string & tags.Format<"uuid">;
  body: IRedditCommunityReportAction.IRequest;
}): Promise<IPageIRedditCommunityReportAction> {
  const { communityModerator, reportId, body } = props;

  const report = await MyGlobal.prisma.reddit_community_reports.findUnique({
    where: { id: reportId },
    select: { id: true },
  });
  if (!report) {
    throw new HttpException("Report not found", 404);
  }

  const page = body.page >= 1 ? body.page : 1;
  const limit = body.limit >= 1 ? body.limit : 10;
  const skip = (page - 1) * limit;

  const whereClause: {
    report_id: string & tags.Format<"uuid">;
    moderator_member_id?: string & tags.Format<"uuid">;
    admin_member_id?: string & tags.Format<"uuid">;
    action_type?: string;
    created_at?: {
      gte?: string & tags.Format<"date-time">;
      lte?: string & tags.Format<"date-time">;
    };
  } = {
    report_id: reportId,
  };

  if (
    body.filterModeratorMemberId !== undefined &&
    body.filterModeratorMemberId !== null
  ) {
    whereClause.moderator_member_id = body.filterModeratorMemberId;
  }

  if (
    body.filterAdminMemberId !== undefined &&
    body.filterAdminMemberId !== null
  ) {
    whereClause.admin_member_id = body.filterAdminMemberId;
  }

  if (body.filterActionType !== undefined && body.filterActionType !== null) {
    whereClause.action_type = body.filterActionType;
  }

  if (
    (body.filterCreatedAtFrom !== undefined &&
      body.filterCreatedAtFrom !== null) ||
    (body.filterCreatedAtTo !== undefined && body.filterCreatedAtTo !== null)
  ) {
    whereClause.created_at = {};
    if (
      body.filterCreatedAtFrom !== undefined &&
      body.filterCreatedAtFrom !== null
    ) {
      whereClause.created_at.gte = body.filterCreatedAtFrom;
    }
    if (
      body.filterCreatedAtTo !== undefined &&
      body.filterCreatedAtTo !== null
    ) {
      whereClause.created_at.lte = body.filterCreatedAtTo;
    }
  }

  const orderByField =
    typeof body.sortBy === "string" ? body.sortBy : "created_at";
  const orderDirection = body.order === "asc" ? "asc" : "desc";

  const [actions, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_report_actions.findMany({
      where: whereClause,
      orderBy: {
        [orderByField]: orderDirection,
      },
      skip,
      take: limit,
      include: {
        moderatorMember: {
          select: {
            id: true,
            email: true,
            is_email_verified: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        adminMember: {
          select: {
            id: true,
            email: true,
            admin_level: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
      },
    }),
    MyGlobal.prisma.reddit_community_report_actions.count({
      where: whereClause,
    }),
  ]);

  const mappedActions = actions.map((action) => ({
    id: action.id,
    report_id: action.report_id,
    moderator_member_id: action.moderator_member_id,
    admin_member_id: action.admin_member_id ?? null,
    action_type: action.action_type,
    notes: action.notes ?? null,
    created_at: toISOStringSafe(action.created_at),
    updated_at: toISOStringSafe(action.updated_at),
    deleted_at: action.deleted_at ? toISOStringSafe(action.deleted_at) : null,
    moderatorMember: action.moderatorMember
      ? {
          id: action.moderatorMember.id,
          email: action.moderatorMember.email,
          is_email_verified: action.moderatorMember.is_email_verified,
          created_at: toISOStringSafe(action.moderatorMember.created_at),
          updated_at: toISOStringSafe(action.moderatorMember.updated_at),
          deleted_at: action.moderatorMember.deleted_at
            ? toISOStringSafe(action.moderatorMember.deleted_at)
            : null,
        }
      : undefined,
    adminMember: action.adminMember
      ? {
          id: action.adminMember.id,
          email: action.adminMember.email,
          admin_level: action.adminMember.admin_level,
          created_at: toISOStringSafe(action.adminMember.created_at),
          updated_at: toISOStringSafe(action.adminMember.updated_at),
          deleted_at: action.adminMember.deleted_at
            ? toISOStringSafe(action.adminMember.deleted_at)
            : null,
        }
      : null,
  }));

  return {
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: mappedActions,
  };
}
