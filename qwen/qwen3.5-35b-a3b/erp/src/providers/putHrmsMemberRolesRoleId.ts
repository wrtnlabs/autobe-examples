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

export async function putHrmsMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmsOrganizationRole.IUpdate;
}): Promise<IHrmsOrganizationRole> {
  // Get the existing role with all needed data
  const role = await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmsOrganizationRoleTransformer.select(),
  });
  // Reject built-in roles (Owner, Manager, Employee)
  if (role.is_builtin || ["Owner", "Manager", "Employee"].includes(role.name)) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // Verify the requesting member is an Owner in the organization
  const ownerMember = await MyGlobal.prisma.hrms_organization_members.findFirst(
    {
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: role.organization.id,
        organizationRole: {
          name: "Owner",
          is_builtin: true,
        },
      },
    },
  );
  if (ownerMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate role name uniqueness if provided
  if (props.body.name !== undefined) {
    const existingRole =
      await MyGlobal.prisma.hrms_organization_roles.findFirst({
        where: {
          organization_id: role.organization.id,
          name: props.body.name,
          id: { not: props.roleId },
        },
      });
    if (existingRole !== null) {
      throw new HttpException("Role name already exists", 400);
    }
  }
  // Update the role
  await MyGlobal.prisma.hrms_organization_roles.update({
    where: { id: props.roleId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });
  // If permissions provided, handle separately via normalized table
  if (props.body.permissions !== undefined) {
    // Delete existing permissions for this role
    await MyGlobal.prisma.hrms_organization_role_permissions.deleteMany({
      where: {
        hrms_organization_role_id: props.roleId,
      },
    });
    // Insert new permissions
    if (props.body.permissions.length > 0) {
      await MyGlobal.prisma.hrms_organization_role_permissions.createMany({
        data: props.body.permissions.map((permission) => ({
          hrms_organization_role_id: props.roleId,
          permission: permission,
        })) as any,
      });
    }
  }
  // Get and return the updated role using transformer
  const updatedRole =
    await MyGlobal.prisma.hrms_organization_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmsOrganizationRoleTransformer.select(),
    });
  return await HrmsOrganizationRoleTransformer.transform(updatedRole);
}
