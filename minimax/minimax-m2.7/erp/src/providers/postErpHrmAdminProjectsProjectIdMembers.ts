import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectMemberCollector } from "../collectors/ErpHrmProjectMemberCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminProjectsProjectIdMembers(props: {
  admin: AdminPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // 1. Verify project exists and get organization ID
  const project = await MyGlobal.prisma.erp_hrm_projects.findUnique({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true, status: true },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Verify project status is 'active'
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot add members to archived or completed projects",
      400,
    );
  }
  // 3. Verify employee exists
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUnique({
    where: { id: props.body.employeeId },
    select: { id: true, erp_hrm_organization_id: true, status: true },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 4. Verify employee belongs to same organization as project
  if (employee.erp_hrm_organization_id !== project.erp_hrm_organization_id) {
    throw new HttpException(
      "Employee does not belong to the same organization as the project",
      403,
    );
  }
  // 5. Verify employee status is 'active'
  if (employee.status !== "active") {
    throw new HttpException(
      "Cannot assign deactivated employee to a project",
      400,
    );
  }
  // 6. Verify employee is not already a member of this project
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findUnique({
      where: {
        erp_hrm_employee_id_erp_hrm_project_id: {
          erp_hrm_employee_id: props.body.employeeId,
          erp_hrm_project_id: props.projectId,
        },
      },
    });
  if (existingMembership) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  // 7. Validate assigned_role
  const validRoles = ["member", "project_lead"];
  if (!validRoles.includes(props.body.assignedRole)) {
    throw new HttpException(
      "Invalid assigned role. Must be 'member' or 'project_lead'",
      400,
    );
  }
  // 8. Create project membership using collector
  await MyGlobal.prisma.erp_hrm_project_members.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      project: { id: project.id },
    }),
  });
  // 9. Get aggregated counts for response
  const memberCount = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: {
      erp_hrm_project_id: props.projectId,
      assigned_role: "member",
    },
  });
  const projectLeadCount = await MyGlobal.prisma.erp_hrm_project_members.count({
    where: {
      erp_hrm_project_id: props.projectId,
      assigned_role: "project_lead",
    },
  });
  return {
    memberCount: memberCount,
    projectLeadCount: projectLeadCount,
  } satisfies IErpHrmProjectMember;
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
// export async function postErpHrmAdminProjectsProjectIdMembers(props: {
//   admin: AdminPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProjectMember.ICreate;
// }): Promise<IErpHrmProjectMember> {
//   await MyGlobal.prisma.erp_hrm_project_members.create({
//     data: await ErpHrmProjectMemberCollector.collect({
//       body: props.body,
//       ...
//     }),
//   });
// }
// ```
//--------------------------------------------------------------