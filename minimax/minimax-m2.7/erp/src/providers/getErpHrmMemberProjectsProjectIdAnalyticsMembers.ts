import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeAtSummaryTransformer } from "../transformers/ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmProjectAtSummaryTransformer } from "../transformers/ErpHrmProjectAtSummaryTransformer";
import { ErpHrmProjectMemberAtInvertTransformer } from "../transformers/ErpHrmProjectMemberAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdAnalyticsMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember.IAnalytic> {
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  if (project.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException("Project not found", 404);
  }
  const roleCounts = await MyGlobal.prisma.erp_hrm_project_members.groupBy({
    by: ["assigned_role"],
    where: { erp_hrm_project_id: props.projectId },
    _count: { assigned_role: true },
  });
  let memberCount = 0;
  let projectLeadCount = 0;
  for (const role of roleCounts) {
    if (role.assigned_role === "member") {
      memberCount = role._count.assigned_role;
    } else if (role.assigned_role === "project_lead") {
      projectLeadCount = role._count.assigned_role;
    }
  }
  const totalMemberCount = memberCount + projectLeadCount;
  const members = await MyGlobal.prisma.erp_hrm_project_members.findMany({
    where: { erp_hrm_project_id: props.projectId },
    orderBy: { created_at: "asc" },
    select: {
      id: true,
      assigned_role: true,
      created_at: true,
      updated_at: true,
      employee: ErpHrmEmployeeAtSummaryTransformer.select(),
      project: ErpHrmProjectAtSummaryTransformer.select(),
    },
  });
  const transformedMembers = await ArrayUtil.asyncMap(
    members,
    async (m) => await ErpHrmProjectMemberAtInvertTransformer.transform(m),
  );
  return {
    totalMemberCount: totalMemberCount as number & tags.Type<"int32">,
    roleBreakdown: {
      memberCount: memberCount as number & tags.Type<"int32">,
      projectLeadCount: projectLeadCount as number & tags.Type<"int32">,
    } satisfies IErpHrmProjectMember,
    members: transformedMembers as unknown as IErpHrmProjectMember.ISummary[],
  } satisfies IErpHrmProjectMember.IAnalytic;
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
// import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberProjectsProjectIdAnalyticsMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmProjectMember.IAnalytic> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------