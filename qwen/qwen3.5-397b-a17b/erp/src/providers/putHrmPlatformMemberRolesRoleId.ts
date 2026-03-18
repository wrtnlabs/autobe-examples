import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdate;
}): Promise<IHrmPlatformRole> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      organization_id: true,
      built_in: true,
      deleted_at: true,
    },
  });
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
      },
    });
  if (role.organization_id !== employee.organization_id) {
    throw new HttpException("Role does not belong to your organization", 403);
  }
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmPlatformRoleTransformer.select(),
  });
  return await HrmPlatformRoleTransformer.transform(updated);
}
