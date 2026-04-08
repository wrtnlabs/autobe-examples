import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
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

export async function putErpHrmAdminProjectsProjectIdMembersProjectMemberId(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // Validate project exists
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
  });
  // Validate project member exists and belongs to the specified project
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: {
        id: props.projectMemberId,
        erp_hrm_project_id: props.projectId,
      },
      select: {
        id: true,
        erp_hrm_project_id: true,
      },
    });
  // Update the assigned role
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: { id: props.projectMemberId },
    data: {
      assigned_role: props.body.assignedRole,
      updated_at: toISOStringSafe(new Date()),
    },
  });
  // Get aggregated counts for the project
  const memberCountResult =
    await MyGlobal.prisma.erp_hrm_project_members.aggregate({
      where: {
        erp_hrm_project_id: props.projectId,
        assigned_role: "member",
      },
      _count: { assigned_role: true },
    });
  const projectLeadCountResult =
    await MyGlobal.prisma.erp_hrm_project_members.aggregate({
      where: {
        erp_hrm_project_id: props.projectId,
        assigned_role: "project_lead",
      },
      _count: { assigned_role: true },
    });
  return {
    memberCount: memberCountResult._count.assigned_role,
    projectLeadCount: projectLeadCountResult._count.assigned_role,
  };
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
// export async function putErpHrmAdminProjectsProjectIdMembersProjectMemberId(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   projectMemberId: string & tags.Format<"uuid">;
//   body: IErpHrmProjectMember.IUpdate;
// }): Promise<IErpHrmProjectMember> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------