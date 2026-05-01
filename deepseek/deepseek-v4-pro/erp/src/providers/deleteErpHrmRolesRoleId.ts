import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmRolesRoleId(props: {
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the role by ID
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  // Step 2: Reject if already soft-deleted
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // Step 3: Reject deletion of built-in roles
  if (role.is_builtin === true) {
    throw new HttpException(
      "Built-in roles (Owner, Manager, Employee) cannot be deleted",
      422,
    );
  }
  // Step 4: Reject if any active employees are assigned to this role
  const activeEmployeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (activeEmployeeCount > 0) {
    throw new HttpException(
      "All employees assigned to this role must be reassigned to a different role before deletion",
      422,
    );
  }
  // Step 5: Soft-delete the role
  await MyGlobal.prisma.erp_hrm_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
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
// export async function deleteErpHrmRolesRoleId(props: {
//   roleId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------