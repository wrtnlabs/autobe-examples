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
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      organization_id: props.organizationId,
    },
    select: { id: true, is_builtin: true },
  });
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  const assignedCount = await MyGlobal.prisma.hrms_organization_members.count({
    where: {
      hrms_organization_role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (assignedCount > 0) {
    throw new HttpException(
      "Cannot delete role: employees are still assigned to it. Reassign employees first.",
      400,
    );
  }
  await MyGlobal.prisma.hrms_organization_roles.delete({
    where: { id: props.roleId },
  });
}
