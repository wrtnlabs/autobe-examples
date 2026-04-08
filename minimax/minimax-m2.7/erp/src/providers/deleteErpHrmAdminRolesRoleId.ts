import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteErpHrmAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find role by ID - throws NotFoundError if not found
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  // Built-in roles cannot be deleted
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // Check if any active employees are assigned to this role
  const employeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (employeeCount > 0) {
    throw new HttpException("Cannot delete role with assigned employees", 409);
  }
  // Delete role permissions and soft delete the role in a transaction
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.erp_hrm_role_permissions.deleteMany({
      where: {
        erp_hrm_role_id: props.roleId,
      },
    }),
    MyGlobal.prisma.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: {
        deleted_at: new Date(),
      },
    }),
  ]);
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
// export async function deleteErpHrmAdminRolesRoleId(props: {
//   admin: AdminPayload;
//   roleId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------