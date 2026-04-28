import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProjectTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeReport";
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

export async function getHrmPlatformMemberProjectsProjectIdReportsTime(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProjectTimeReport[]> {
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: { hrm_platform_organization_id: true },
    },
  );
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const aggregated = await MyGlobal.prisma.hrm_platform_timelogs.groupBy({
    by: ["hrm_platform_employee_id"],
    where: {
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
    _sum: { duration_minutes: true },
    _count: { _all: true },
    orderBy: [
      { _sum: { duration_minutes: "desc" } },
      { hrm_platform_employee_id: "asc" },
    ],
  });
  if (aggregated.length === 0) {
    return [];
  }
  const employeeIds = aggregated.map((a) => a.hrm_platform_employee_id);
  const employeeRecords = await MyGlobal.prisma.hrm_platform_employees.findMany(
    {
      where: {
        id: { in: employeeIds },
      },
      select: {
        id: true,
        hrm_platform_member_id: true,
      },
    },
  );
  const memberIds = Array.from(
    new Set(employeeRecords.map((e) => e.hrm_platform_member_id)),
  );
  const memberRecords = await MyGlobal.prisma.hrm_platform_members.findMany({
    where: {
      id: { in: memberIds },
    },
    select: {
      id: true,
      display_name: true,
    },
  });
  const memberNameMap = new Map<string, string>(
    memberRecords.map((m) => [m.id, m.display_name]),
  );
  const employeeToMember = new Map<string, string>(
    employeeRecords.map((e) => [e.id, e.hrm_platform_member_id]),
  );
  return aggregated.map((agg) => {
    const memberId = employeeToMember.get(agg.hrm_platform_employee_id) ?? "";
    const name = memberNameMap.get(memberId) ?? "Unknown";
    return {
      employee_id: agg.hrm_platform_employee_id as string & tags.Format<"uuid">,
      employee_name: name,
      total_minutes: (agg._sum.duration_minutes ?? 0) as number &
        tags.Type<"int32">,
      timelog_count: agg._count._all as number & tags.Type<"int32">,
    };
  });
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
// import { IHrmPlatformProjectTimeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProjectTimeReport";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberProjectsProjectIdReportsTime(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformProjectTimeReport> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------