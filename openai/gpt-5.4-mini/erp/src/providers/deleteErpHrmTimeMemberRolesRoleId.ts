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

export async function deleteErpHrmTimeMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirst({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  if (role === null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  const assignedEmployee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirst({
      where: {
        erp_hrm_time_role_id: role.id,
      },
      select: {
        id: true,
      },
    });
  if (assignedEmployee !== null) {
    throw new HttpException("Role is currently assigned to employees", 409);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_roles.delete({
      where: {
        id: role.id,
      },
    });
  });
}
