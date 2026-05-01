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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization selected", 400);
  }
  await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  await MyGlobal.prisma.erp_hrm_employees.findUniqueOrThrow({
    where: {
      id: props.body.employee_id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
    },
    select: { id: true },
  });
  const membership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirstOrThrow({
      where: {
        erp_hrm_employee_id: props.body.employee_id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { id: true },
    });
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: { id: membership.id },
    data: {
      role: props.body.role,
      updated_at: new Date().toISOString(),
    },
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: { id: membership.id },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return await ErpHrmProjectMemberTransformer.transform(updated);
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
// export async function putErpHrmMemberProjectsProjectIdMembers(props: {
//   member: MemberPayload;
//   projectId: string & tags.Format<"uuid">;
//   body: IErpHrmProjectMember.IUpdate;
// }): Promise<IErpHrmProjectMember> {
//   await MyGlobal.prisma.erp_hrm_project_members.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmProjectMemberTransformer.select(),
//   });
//   return await ErpHrmProjectMemberTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------