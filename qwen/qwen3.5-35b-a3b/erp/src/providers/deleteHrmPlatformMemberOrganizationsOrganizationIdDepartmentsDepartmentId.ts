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
  // Verify the member's session is valid and active
  const session = await MyGlobal.prisma.hrm_platform_member_sessions.findFirst({
    where: {
      id: props.member.session_id,
      expired_at: { gt: toISOStringSafe(new Date()) },
      hrm_platform_member_id: props.member.id,
      member: {
        id: props.member.id,
        is_active: true,
        deleted_at: null,
      },
    },
  });
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  // Verify user has org:manage permission for the organization
  const userRole = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      organization_id: props.organizationId,
      employees: {
        some: {
          hrm_platform_member_id: props.member.id,
        },
      },
    },
    include: {
      permissions: {
        where: {
          code: "org:manage",
        },
      },
    },
  });
  if (userRole === null || userRole.permissions.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify department exists and belongs to the organization
  const department = await MyGlobal.prisma.hrm_platform_departments.findFirst({
    where: {
      id: props.departmentId,
      organization_id: props.organizationId,
    },
  });
  if (department === null) {
    throw new HttpException("Department not found", 404);
  }
  // Set all employees currently assigned to this department to have null department_id
  await MyGlobal.prisma.hrm_platform_employees.updateMany({
    where: {
      hrm_platform_department_id: props.departmentId,
    },
    data: {
      hrm_platform_department_id: null,
    },
  });
  // Perform hard delete of the department record
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