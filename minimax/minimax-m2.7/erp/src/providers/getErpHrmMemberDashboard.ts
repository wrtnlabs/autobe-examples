import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimerAtSummaryTransformer } from "../transformers/ErpHrmTimerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberDashboard(props: {
  member: MemberPayload;
}): Promise<IErpHrmMember> {
  // Step 1: Query current member's employee record to get organization context
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const organizationId = employee.erp_hrm_organization_id;
  // Step 2: Verify report:view permission
  const hasReportViewPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "report:view",
      },
      select: {
        id: true,
      },
    });
  if (!hasReportViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Query active timers belonging to employees in the current organization
  const activeTimers = await MyGlobal.prisma.erp_hrm_timers.findMany({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
    },
    orderBy: {
      started_at: "desc",
    },
    ...ErpHrmTimerAtSummaryTransformer.select(),
  });
  // Step 4: Query project summary (count by status)
  const projectStatusCounts = await MyGlobal.prisma.erp_hrm_projects.groupBy({
    by: ["status"],
    where: {
      erp_hrm_organization_id: organizationId,
    },
    _count: {
      status: true,
    },
  });
  const projectSummary: {
    active: number & tags.Type<"int32">;
    archived: number & tags.Type<"int32">;
    completed: number & tags.Type<"int32">;
  } = {
    active: 0,
    archived: 0,
    completed: 0,
  };
  for (const item of projectStatusCounts) {
    if (item.status === "active") {
      projectSummary.active = item._count.status;
    } else if (item.status === "archived") {
      projectSummary.archived = item._count.status;
    } else if (item.status === "completed") {
      projectSummary.completed = item._count.status;
    }
  }
  // Step 5: Query task counts by status and priority (combined query for efficiency)
  const taskCounts = await MyGlobal.prisma.erp_hrm_tasks.groupBy({
    by: ["status", "priority"],
    where: {
      project: {
        erp_hrm_organization_id: organizationId,
      },
    },
    _count: {
      _all: true,
    },
  });
  const taskOverview = {
    byStatus: {
      open: 0 as number & tags.Type<"int32">,
      inProgress: 0 as number & tags.Type<"int32">,
      completed: 0 as number & tags.Type<"int32">,
      closed: 0 as number & tags.Type<"int32">,
    },
    byPriority: {
      low: 0 as number & tags.Type<"int32">,
      medium: 0 as number & tags.Type<"int32">,
      high: 0 as number & tags.Type<"int32">,
      urgent: 0 as number & tags.Type<"int32">,
    },
  };
  for (const item of taskCounts) {
    // Map by status
    if (item.status === "open") {
      taskOverview.byStatus.open += item._count._all;
    } else if (item.status === "in-progress") {
      taskOverview.byStatus.inProgress += item._count._all;
    } else if (item.status === "completed") {
      taskOverview.byStatus.completed += item._count._all;
    } else if (item.status === "closed") {
      taskOverview.byStatus.closed += item._count._all;
    }
    // Map by priority
    if (item.priority === "low") {
      taskOverview.byPriority.low += item._count._all;
    } else if (item.priority === "medium") {
      taskOverview.byPriority.medium += item._count._all;
    } else if (item.priority === "high") {
      taskOverview.byPriority.high += item._count._all;
    } else if (item.priority === "urgent") {
      taskOverview.byPriority.urgent += item._count._all;
    }
  }
  // Step 6: Query recent activity (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      employee: {
        erp_hrm_organization_id: organizationId,
      },
      created_at: {
        gte: sevenDaysAgo,
      },
    },
    _count: {
      id: true,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const recentActivity = {
    timelogsCount: (recentTimelogs._count.id ?? 0) as number &
      tags.Type<"int32">,
    totalHoursThisWeek: (recentTimelogs._sum.duration_minutes ?? 0) / 60.0,
  };
  // Step 7: Transform and return dashboard response
  const transformedTimers = await ArrayUtil.asyncMap(
    activeTimers,
    ErpHrmTimerAtSummaryTransformer.transform,
  );
  return {
    activeTimers: transformedTimers,
    projectSummary,
    taskOverview,
    recentActivity,
  };
}
