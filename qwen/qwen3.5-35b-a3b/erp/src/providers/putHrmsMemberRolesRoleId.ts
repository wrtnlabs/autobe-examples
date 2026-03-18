import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsMember";
import { IHrmsOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganization";
import { IHrmsOrganizationRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsOrganizationRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmsOrganizationAtSummaryTransformer } from "../transformers/HrmsOrganizationAtSummaryTransformer";
import { HrmsOrganizationRoleTransformer } from "../transformers/HrmsOrganizationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmsMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmsOrganizationRole.IUpdate;
}): Promise<IHrmsOrganizationRole> {
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      organization_id: true,
      permissions: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Cannot update built-in roles", 400);
  }
  if (props.body.name !== undefined) {
    const duplicateRole =
      await MyGlobal.prisma.hrms_organization_roles.findFirst({
        where: {
          organization_id: role.organization_id,
          name: props.body.name,
          id: { not: props.roleId },
        },
      });
    if (duplicateRole) {
      throw new HttpException(
        "Role name must be unique within the organization",
        400,
      );
    }
  }
  const updatedRole = await MyGlobal.prisma.hrms_organization_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.permissions !== undefined && {
        permissions: {
          deleteMany: {},
          create: props.body.permissions.map((p) => ({
            permission: p,
            id: v4(),
            created_at: new Date(),
            updated_at: new Date(),
          })),
        },
      }),
      updated_at: toISOStringSafe(new Date()),
    },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      created_at: true,
      updated_at: true,
      organization: HrmsOrganizationAtSummaryTransformer.select(),
      permissions: true,
      organizationMembers: true,
      employees: true,
    },
  });
  return HrmsOrganizationRoleTransformer.transform(updatedRole);
}
