import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmEmployeeCollector } from "../collectors/ErpHrmEmployeeCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmEmployeeTransformer } from "../transformers/ErpHrmEmployeeTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberEmployees(props: {
  member: MemberPayload;
  body: IErpHrmEmployee.ICreate;
}): Promise<IErpHrmEmployee> {
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  const organizationId = session.erp_hrm_organization_id;
  if (!organizationId) {
    throw new HttpException("No organization selected", 400);
  }
  const inviter = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { email: true },
  });
  if (inviter.email === props.body.email) {
    throw new HttpException("Cannot invite yourself", 422);
  }
  await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: {
      id: props.body.erp_hrm_role_id,
      erp_hrm_organization_id: organizationId,
      deleted_at: null,
    },
  });
  if (props.body.erp_hrm_department_id) {
    await MyGlobal.prisma.erp_hrm_departments.findUniqueOrThrow({
      where: {
        id: props.body.erp_hrm_department_id,
        erp_hrm_organization_id: organizationId,
        deleted_at: null,
      },
    });
  }
  const invitee = await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { email: props.body.email },
    select: { id: true, deleted_at: true },
  });
  if (invitee.deleted_at !== null) {
    throw new HttpException("Invited member account is deleted", 422);
  }
  const existingEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: invitee.id,
      erp_hrm_organization_id: organizationId,
    },
    select: { id: true },
  });
  if (existingEmployee) {
    throw new HttpException(
      "Employee already exists in this organization",
      409,
    );
  }
  const organization = { id: organizationId } satisfies IEntity;
  const record = await MyGlobal.prisma.erp_hrm_employees.create({
    data: await ErpHrmEmployeeCollector.collect({
      body: props.body,
      organization,
    }),
    ...ErpHrmEmployeeTransformer.select(),
  });
  return await ErpHrmEmployeeTransformer.transform(record);
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
// import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
// import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmMemberEmployees(props: {
//   member: MemberPayload;
//   body: IErpHrmEmployee.ICreate;
// }): Promise<IErpHrmEmployee> {
//   const record = await MyGlobal.prisma.erp_hrm_employees.create({
//     data: await ErpHrmEmployeeCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmEmployeeTransformer.select(),
//   });
//   return await ErpHrmEmployeeTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------