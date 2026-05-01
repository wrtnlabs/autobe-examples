import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectMemberCollector } from "../collectors/ErpHrmProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (!session.erp_hrm_organization_id) {
    throw new HttpException("No organization selected", 400);
  }
  const organizationId: string = session.erp_hrm_organization_id;
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, organization_id: true, status: true },
  });
  if (project.organization_id !== organizationId) {
    throw new HttpException("Project not found in current organization", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      "Cannot assign members to non-active projects",
      422,
    );
  }
  const employee = await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: { id: props.body.erp_hrm_employee_id, deleted_at: null },
    select: { id: true, status: true, erp_hrm_organization_id: true },
  });
  if (employee.status !== "active") {
    throw new HttpException(
      "Cannot assign deactivated employee to project",
      422,
    );
  }
  if (employee.erp_hrm_organization_id !== organizationId) {
    throw new HttpException(
      "Employee does not belong to the same organization",
      422,
    );
  }
  const existing = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
    where: {
      erp_hrm_employee_id: props.body.erp_hrm_employee_id,
      erp_hrm_project_id: props.projectId,
    },
  });
  if (existing) {
    throw new HttpException(
      "Employee is already a member of this project",
      409,
    );
  }
  const record = await MyGlobal.prisma.erp_hrm_project_members.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      erpHrmProjects: { id: project.id },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  return await ErpHrmProjectMemberTransformer.transform(record);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProjectMember.ICreate;
// }): Promise<IErpHrmProjectMember> {
//   const record = await MyGlobal.prisma.erp_hrm_project_members.create({
//     data: await ErpHrmProjectMemberCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmProjectMemberTransformer.select(),
//   });
//   return await ErpHrmProjectMemberTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------