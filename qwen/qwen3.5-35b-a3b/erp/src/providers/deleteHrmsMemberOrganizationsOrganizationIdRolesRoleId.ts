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

export async function deleteHrmsMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify role exists in the organization
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
  });
  // Verify role belongs to the specified organization
  if (role.organization_id !== props.organizationId) {
    throw new HttpException("Role not found in this organization", 404);
  }
  // Built-in roles cannot be deleted
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  // Check for any employees assigned to this role
  const assignedEmployees =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_organization_role_id: props.roleId,
        deleted_at: null,
      },
    });
  if (assignedEmployees.length > 0) {
    throw new HttpException(
      "Cannot delete role with assigned employees. Reassign all employees first.",
      400,
    );
  }
  // Delete the role (cascade handles hrms_organization_role_permissions)
  await MyGlobal.prisma.hrms_organization_roles.delete({
    where: { id: props.roleId },
  });
}
