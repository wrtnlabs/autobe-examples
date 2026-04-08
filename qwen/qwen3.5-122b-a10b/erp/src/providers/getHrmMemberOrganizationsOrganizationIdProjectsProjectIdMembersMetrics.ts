import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmProjectMemberMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMemberMetric";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdMembersMetrics(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmProjectMemberMetric> {
  // 1. Verify project exists and belongs to the specified organization
  const project = await MyGlobal.prisma.hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
      hrm_organization_id: props.organizationId,
    },
  });
  // 2. Count total active project members (excluding soft-deleted)
  const totalMembers = await MyGlobal.prisma.hrm_project_members.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // 3. Count members by role (member vs project-lead)
  const membersByRoleGroup = await MyGlobal.prisma.hrm_project_members.groupBy({
    by: ["role"],
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _count: { role: true },
  });
  const memberCount =
    membersByRoleGroup.find((r) => r.role === "member")?._count.role ?? 0;
  const projectLeadCount =
    membersByRoleGroup.find((r) => r.role === "project-lead")?._count.role ?? 0;
  // 4. Calculate total hours from timelogs (SUM of duration_minutes / 60)
  const timelogsAggregation = await MyGlobal.prisma.hrm_timelogs.groupBy({
    by: ["hrm_project_id"],
    where: {
      hrm_project_id: props.projectId,
      deleted_at: null,
    },
    _sum: { duration_minutes: true },
  });
  const totalMinutes =
    timelogsAggregation.find((t) => t.hrm_project_id === props.projectId)?._sum
      .duration_minutes ?? 0;
  const totalHours = Number(totalMinutes ?? 0) / 60;
  // 5. Calculate average hours per member (handle division by zero)
  const averageHoursPerMember =
    totalMembers > 0 ? totalHours / totalMembers : null;
  // 6. Count active timers across all project members
  const activeTimersCount = await MyGlobal.prisma.hrm_active_timers.count({
    where: {
      project_id: props.projectId,
    },
  });
  // 7. Return the metrics object
  return {
    total_members: totalMembers,
    members_by_role: {
      member: memberCount,
      project_lead: projectLeadCount,
    },
    total_hours: totalHours,
    average_hours_per_member: averageHoursPerMember,
    active_timers_count: activeTimersCount,
  } satisfies IHrmProjectMemberMetric;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IHrmProjectMemberMetric } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMemberMetric";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmMemberOrganizationsOrganizationIdProjectsProjectIdMembersMetrics(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmProjectMemberMetric> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------