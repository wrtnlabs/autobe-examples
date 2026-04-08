import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  departmentId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Get employee record to find the member's role_id
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_member_id: props.member.id,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  if (employee === null) {
    throw new HttpException("Not Found", 404);
  }
  // Verify member has org:manage permission for the organization
  const permissions = await MyGlobal.prisma.hrm_platform_permissions.findMany({
    where: {
      role_id: employee.hrm_platform_role_id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  });
  const hasManagePermission = permissions.some((p) => p.code === "org:manage");
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Query department to ensure it exists and belongs to the organization
  const department = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      id: props.departmentId,
      organization_id: props.organizationId,
      deleted_at: null,
    },
  } satisfies Prisma.hrm_platform_departmentsFindFirstArgs);
  if (department === null) {
    throw new HttpException("Not Found", 404);
  }
  // 3. Set all employees' department_id to null
  await MyGlobal.prisma.hrm_platform_employees.updateMany({
    where: {
      hrm_platform_organization_id: props.organizationId,
      hrm_platform_department_id: props.departmentId,
    },
    data: {
      hrm_platform_department_id: null,
    },
  });
  // 4. Hard delete the department record
  await MyGlobal.prisma.hrm_platform_departments.delete({
    where: {
      id: props.departmentId,
    },
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmPlatformMemberOrganizationsOrganizationIdDepartmentsDepartmentId(props: {
//   member: MemberPayload;
//   organizationId: string & tags.Format<"uuid">;
//   departmentId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------