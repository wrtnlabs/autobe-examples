import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmProjectMemberTransformer } from "../transformers/HrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmProjectMember.IUpdate;
}): Promise<IHrmProjectMember> {
  // Validate project exists and is not soft-deleted
  const project = await MyGlobal.prisma.hrm_projects.findUnique({
    where: { id: props.projectId, deleted_at: null },
    select: { hrm_organization_id: true },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Validate employee exists and belongs to same organization
  const employee = await MyGlobal.prisma.hrm_employees.findUnique({
    where: { id: props.employeeId, deleted_at: null },
    select: { organization_id: true },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.organization_id !== project.hrm_organization_id) {
    throw new HttpException(
      "Employee does not belong to the project's organization",
      400,
    );
  }
  // Validate project member assignment exists
  const existing = await MyGlobal.prisma.hrm_project_members.findUnique({
    where: {
      project_id_employee_id: {
        project_id: props.projectId,
        employee_id: props.employeeId,
      },
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing === null) {
    throw new HttpException("Project member assignment not found", 404);
  }
  // Validate role value if provided
  if (props.body.role !== undefined) {
    if (props.body.role !== "member" && props.body.role !== "project-lead") {
      throw new HttpException(
        "Invalid role value. Must be 'member' or 'project-lead'",
        400,
      );
    }
  }
  // Update the role
  await MyGlobal.prisma.hrm_project_members.update({
    where: { id: existing.id },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: new Date(),
    },
  });
  // Fetch and transform the updated record
  const updated = await MyGlobal.prisma.hrm_project_members.findUniqueOrThrow({
    where: { id: existing.id },
    ...HrmProjectMemberTransformer.select(),
  });
  return await HrmProjectMemberTransformer.transform(updated);
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
// import { IHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProjectMember";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberProjectsProjectIdMembersEmployeeId(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   employeeId: string & tags.Format<"uuid">;
//   body: IHrmProjectMember.IUpdate;
// }): Promise<IHrmProjectMember> {
//   await MyGlobal.prisma.hrm_project_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_project_members.findUniqueOrThrow({
//     where: { ... },
//     ...HrmProjectMemberTransformer.select(),
//   });
//   return await HrmProjectMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------