import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmOrganizationMemberCollector } from "../collectors/ErpHrmOrganizationMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmOrganizationMemberTransformer } from "../transformers/ErpHrmOrganizationMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationMembers(props: {
  member: MemberPayload;
  body: IErpHrmOrganizationMember.ICreate;
}): Promise<IErpHrmOrganizationMember> {
  // Verify the member belongs to the target organization and has employee:manage permission
  const requestingMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: props.body.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              where: { permission: "employee:manage" },
              select: { permission: true },
            },
          },
        },
      },
    } satisfies Prisma.erp_hrm_organization_membersFindFirstArgs);
  if (!requestingMembership) {
    throw new HttpException("Membership not found in this organization", 403);
  }
  const hasPermission = requestingMembership.role.rolePermissions.length > 0;
  if (!hasPermission) {
    throw new HttpException(
      "Forbidden - employee:manage permission required",
      403,
    );
  }
  // Verify the user exists
  await MyGlobal.prisma.erp_hrm_members.findUniqueOrThrow({
    where: { id: props.body.userId },
  });
  // Verify the role exists and belongs to the same organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.body.roleId,
      organization_id: props.body.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (!role) {
    throw new HttpException("Role not found in this organization", 404);
  }
  // Verify department if provided
  if (props.body.departmentId) {
    const department = await MyGlobal.prisma.erp_hrm_departments.findFirst({
      where: {
        id: props.body.departmentId,
        organization_id: props.body.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!department) {
      throw new HttpException("Department not found in this organization", 404);
    }
  }
  // Check uniqueness constraint - user cannot have multiple memberships in same organization
  const existingMembership =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.body.userId,
        organization_id: props.body.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingMembership) {
    throw new HttpException(
      "User is already a member of this organization",
      409,
    );
  }
  // Create the organization member using collector
  const created = await MyGlobal.prisma.erp_hrm_organization_members.create({
    data: await ErpHrmOrganizationMemberCollector.collect({ body: props.body }),
    ...ErpHrmOrganizationMemberTransformer.select(),
  });
  // Transform and return the created record
  return await ErpHrmOrganizationMemberTransformer.transform(created);
}
