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

export async function deleteHrmTimeTrackingMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role: {
          select: {
            code: true,
          },
        },
      },
    });
  if (employee.role.code !== "OWNER") {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be deleted", 400);
  }
  const assigned =
    await MyGlobal.prisma.hrm_time_tracking_employee_roles.findFirst({
      where: {
        hrm_time_tracking_role_id: role.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (assigned !== null) {
    throw new HttpException("Role is still assigned to employees", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_roles.delete({
      where: {
        id: role.id,
      },
    });
  });
}
