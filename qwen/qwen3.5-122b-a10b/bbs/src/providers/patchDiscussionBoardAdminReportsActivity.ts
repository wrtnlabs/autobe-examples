import { IDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardActivityReport";
import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardActivityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardActivityReport";
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

export async function patchDiscussionBoardAdminReportsActivity(props: {
  admin: AdminPayload;
  body: IDiscussionBoardActivityReport.IRequest;
}): Promise<IPageIDiscussionBoardActivityReport.ISummary> {
  const page = props.body.page;
  const pageSize = props.body.pageSize ?? 100;
  const limit = props.body.limit ?? 100;
  const effectiveLimit = Math.min(limit, 100);
  const skip = (page - 1) * effectiveLimit;
  const whereInput: Prisma.discussion_board_audit_logsWhereInput = {};
  // Build created_at filter directly without spreading
  const created_at: any = {};
  if (props.body.startDate) {
    created_at.gte = new Date(props.body.startDate);
  }
  if (props.body.endDate) {
    created_at.lte = new Date(props.body.endDate);
  }
  if (Object.keys(created_at).length > 0) {
    whereInput.created_at = created_at;
  }
  if (props.body.actionTypes && props.body.actionTypes.length > 0) {
    whereInput.action_type = { in: props.body.actionTypes };
  }
  if (props.body.actorTypes && props.body.actorTypes.length > 0) {
    whereInput.actor_type = { in: props.body.actorTypes };
  }
  const total = await MyGlobal.prisma.discussion_board_audit_logs.count({
    where: whereInput,
  });
  const actionTypeCounts =
    await MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["action_type"],
      where: whereInput,
      _count: { action_type: true },
    });
  const actionTypeBreakdown: Record<string, number> = {};
  for (const item of actionTypeCounts) {
    actionTypeBreakdown[item.action_type] = item._count.action_type;
  }
  const actorTypeCounts =
    await MyGlobal.prisma.discussion_board_audit_logs.groupBy({
      by: ["actor_type"],
      where: whereInput,
      _count: { actor_type: true },
    });
  let memberActivityCount = 0;
  let adminActivityCount = 0;
  for (const item of actorTypeCounts) {
    if (item.actor_type === "member") {
      memberActivityCount = item._count.actor_type;
    } else if (item.actor_type === "admin") {
      adminActivityCount = item._count.actor_type;
    }
  }
  const orderByInput: Prisma.discussion_board_audit_logsOrderByWithRelationInput =
    {
      created_at: "desc",
    };
  const records = await MyGlobal.prisma.discussion_board_audit_logs.findMany({
    where: whereInput,
    skip,
    take: effectiveLimit,
    orderBy: orderByInput,
    include: {
      member: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          _count: {
            select: {
              articles: true,
              comments: true,
            },
          },
        },
      },
      admin: {
        select: {
          id: true,
          email: true,
          display_name: true,
          grade: true,
          created_at: true,
        },
      },
    },
  });
  const actorCounts = await MyGlobal.prisma.$queryRaw<
    Array<{
      actor_id: string;
      actor_type: string;
      _count: {
        id: number;
      };
    }>
  >(Prisma.sql`
      SELECT 
        CASE WHEN member_id IS NOT NULL THEN member_id ELSE admin_id END as actor_id,
        actor_type,
        COUNT(*) as _count
      FROM discussion_board_audit_logs
      WHERE 1=1
        ${
          props.body.startDate
            ? Prisma.sql`AND created_at >= ${new Date(props.body.startDate)}`
            : Prisma.sql``
        }
        ${
          props.body.endDate
            ? Prisma.sql`AND created_at <= ${new Date(props.body.endDate)}`
            : Prisma.sql``
        }
        ${
          props.body.actionTypes && props.body.actionTypes.length > 0
            ? Prisma.sql`AND action_type IN (${Prisma.join(props.body.actionTypes)})`
            : Prisma.sql``
        }
        ${
          props.body.actorTypes && props.body.actorTypes.length > 0
            ? Prisma.sql`AND actor_type IN (${Prisma.join(props.body.actorTypes)})`
            : Prisma.sql``
        }
      GROUP BY 
        CASE WHEN member_id IS NOT NULL THEN member_id ELSE admin_id END,
        actor_type
      ORDER BY _count DESC
      LIMIT 10
    `);
  const topActors: Array<
    IDiscussionBoardMember.ISummary | IDiscussionBoardAdmin.ISummary
  > = [];
  for (const item of actorCounts) {
    if (item.actor_type === "member") {
      const member = await MyGlobal.prisma.discussion_board_members.findUnique({
        where: { id: item.actor_id },
        select: {
          id: true,
          display_name: true,
          bio: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
          _count: {
            select: {
              articles: true,
              comments: true,
            },
          },
        },
      });
      if (member) {
        topActors.push({
          id: member.id,
          displayName: member.display_name,
          bio: member.bio,
          articleCount: member._count.articles,
          commentCount: member._count.comments,
          createdAt: toISOStringSafe(member.created_at),
          updatedAt: toISOStringSafe(member.updated_at),
          deletedAt: member.deleted_at
            ? toISOStringSafe(member.deleted_at)
            : null,
        } satisfies IDiscussionBoardMember.ISummary);
      }
    } else if (item.actor_type === "admin") {
      const admin = await MyGlobal.prisma.discussion_board_admins.findUnique({
        where: { id: item.actor_id },
        select: {
          id: true,
          email: true,
          display_name: true,
          grade: true,
          created_at: true,
        },
      });
      if (admin) {
        topActors.push({
          id: admin.id,
          email: admin.email,
          display_name: admin.display_name,
          grade: admin.grade,
          created_at: toISOStringSafe(admin.created_at),
        } satisfies IDiscussionBoardAdmin.ISummary);
      }
    }
  }
  const startDateStr = props.body.startDate
    ? props.body.startDate
    : toISOStringSafe(new Date(0));
  const endDateStr = props.body.endDate
    ? props.body.endDate
    : toISOStringSafe(new Date());
  const reports: IDiscussionBoardActivityReport.ISummary[] = records.map(
    (record, index) => {
      const cursorData = {
        id: record.id,
        created_at: toISOStringSafe(record.created_at),
        page: page,
        index: index,
      };
      return {
        id: v4() as unknown as string & tags.Format<"uuid">,
        start_date: startDateStr,
        end_date: endDateStr,
        total_count: total,
        member_activity_count: memberActivityCount,
        admin_activity_count: adminActivityCount,
        action_type_breakdown: actionTypeBreakdown,
        top_actors: topActors.length > 0 ? topActors : undefined,
        cursor: btoa(JSON.stringify(cursorData)),
        created_at: toISOStringSafe(new Date()),
      } satisfies IDiscussionBoardActivityReport.ISummary;
    },
  );
  const pages = total === 0 ? 0 : Math.ceil(total / effectiveLimit);
  return {
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: reports,
  };
}
