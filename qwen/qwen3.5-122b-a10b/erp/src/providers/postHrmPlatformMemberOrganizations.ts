import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmPlatformOrganizationCollector } from "../collectors/HrmPlatformOrganizationCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.ICreate;
}): Promise<IHrmPlatformOrganization> {
  // Check for duplicate organization name
  const existing = await MyGlobal.prisma.hrm_platform_organizations.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Organization name already exists", 409);
  }
  const result = await MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Create organization
    const organization = await tx.hrm_platform_organizations.create({
      data: await HrmPlatformOrganizationCollector.collect({
        body: props.body,
        hrmPlatformMembers: { id: props.member.id } as any,
        hrmPlatformMemberSessions: { id: props.member.session_id } as any,
      }),
    });
    // 2. Create built-in roles
    const roleIds = await ArrayUtil.asyncMap(
      [
        {
          code: "owner",
          name: "Owner",
          description: "Organization owner with full administrative privileges",
        },
        {
          code: "manager",
          name: "Manager",
          description:
            "Manager with employee and project management capabilities",
        },
        {
          code: "employee",
          name: "Employee",
          description: "Standard employee with time tracking and task access",
        },
      ],
      async (roleData) => {
        const roleId = v4() as string & tags.Format<"uuid">;
        await tx.hrm_platform_roles.create({
          data: {
            id: roleId,
            hrm_platform_organization_id: organization.id,
            code: roleData.code,
            name: roleData.name,
            description: roleData.description,
            is_builtin: true,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
        return roleId;
      },
    );
    // 3. Create employee record with Owner role
    const ownerId = roleIds[0];
    await tx.hrm_platform_employees.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: organization.id,
        hrm_platform_role_id: ownerId,
        hrm_platform_department_id: null,
        position: null,
        employment_type: "full-time",
        status: "active",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    return organization;
  });
  return await HrmPlatformOrganizationTransformer.transform(result);
}
