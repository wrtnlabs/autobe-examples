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
import { HrmsOrganizationRoleTransformer } from "../transformers/HrmsOrganizationRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmsMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmsOrganizationRole.ICreate;
}): Promise<IHrmsOrganizationRole> {
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: {
        hrms_organization_id_hrms_member_id: {
          hrms_organization_id: props.organizationId,
          hrms_member_id: props.member.id,
        },
      },
      select: { hrms_organization_role_id: true, id: true },
    });
  const memberRole =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: { id: organizationMember.hrms_organization_role_id },
      select: { is_builtin: true, name: true },
    });
  if (memberRole.is_builtin === false || memberRole.name !== "Owner") {
    throw new HttpException("Forbidden", 403);
  }
  const existingRole = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: {
      organization_id: props.organizationId,
      name: props.body.name,
    },
  });
  if (existingRole !== null) {
    throw new HttpException(
      "Role name already exists in this organization",
      400,
    );
  }
  const role = await MyGlobal.prisma.$transaction(async (tx) => {
    const id = v4();
    const createdRole = await tx.hrms_organization_roles.create({
      data: {
        id,
        organization_id: props.organizationId,
        name: props.body.name,
        is_builtin: false,
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
    if (
      props.body.permissions !== undefined &&
      props.body.permissions.length > 0
    ) {
      await tx.hrms_organization_role_permissions.createMany({
        data: props.body.permissions.map((permission, i) => ({
          id: v4(),
          hrms_organization_role_id: id,
          permission,
          created_at: new Date(),
          updated_at: new Date(),
        })),
      });
    }
    return createdRole;
  });
  const roleWithPermissions =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: { id: role.id },
      ...HrmsOrganizationRoleTransformer.select(),
    });
  return await HrmsOrganizationRoleTransformer.transform(roleWithPermissions);
}
