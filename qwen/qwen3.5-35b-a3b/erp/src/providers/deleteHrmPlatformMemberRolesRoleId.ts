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

export async function deleteHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify the role exists and is not soft-deleted
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_kind: true,
      deleted_at: true,
    },
  });
  // Step 2: Check role_kind field - reject if built-in role
  if (role.role_kind === "built_in") {
    throw new HttpException(
      "Cannot delete built-in roles. Only custom roles can be deleted.",
      403,
    );
  }
  // Step 3: Count assigned employees
  const assignedEmployeeCount =
    await MyGlobal.prisma.hrm_platform_employees.count({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
    });
  // Step 4: If any employee is assigned, reject deletion
  if (assignedEmployeeCount > 0) {
    throw new HttpException(
      "Cannot delete role. All employees assigned to this role must be reassigned first.",
      400,
    );
  }
  // Step 5: Perform soft delete by setting deleted_at to current timestamp
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: {
      id: props.roleId,
    },
    data: {
      deleted_at: new Date(),
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
// export async function deleteHrmPlatformMemberRolesRoleId(props: {
//   member: MemberPayload;
//   roleId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------