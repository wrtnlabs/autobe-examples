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

export async function deleteErpHrmAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Fetch the role by id - throws 404 if not found
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  // Step 2: Check if role is built-in (cannot delete built-in roles)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted.", 400);
  }
  // Step 3: Check if any employees are assigned to this role
  const employeeCount = await MyGlobal.prisma.erp_hrm_employees.count({
    where: {
      erp_hrm_role_id: props.roleId,
      deleted_at: null,
    },
  });
  // Step 4: If employees are assigned, reject deletion
  if (employeeCount > 0) {
    throw new HttpException(
      "Cannot delete role while employees are assigned to it.",
      400,
    );
  }
  // Step 5: Perform soft delete by setting deleted_at timestamp
  await MyGlobal.prisma.erp_hrm_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
}
