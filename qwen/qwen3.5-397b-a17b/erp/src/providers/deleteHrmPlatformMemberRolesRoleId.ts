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
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
  });
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 400);
  }
  const employeesWithRole =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        role_id: props.roleId,
        deleted_at: null,
      },
    });
  if (employeesWithRole !== null) {
    throw new HttpException(
      "Cannot delete role with assigned employees. Reassign employees first.",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: {
      id: props.roleId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
}
