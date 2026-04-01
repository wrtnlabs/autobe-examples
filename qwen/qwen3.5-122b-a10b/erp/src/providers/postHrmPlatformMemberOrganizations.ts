import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformMemberOrganizations(props: {
  member: MemberPayload;
  body: IHrmPlatformOrganization.ICreate;
}): Promise<IHrmPlatformOrganization> {
  const organizationId = v4() as string & typeof v4 extends string
    ? string & tags.Format<"uuid">
    : never;
  const now = new Date();
  const existing = await MyGlobal.prisma.hrm_platform_organizations.findFirst({
    where: {
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existing !== null) {
    throw new HttpException("Organization name already exists", 409);
  }
  const existingEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: organizationId,
        deleted_at: null,
      },
    });
  if (existingEmployee !== null) {
    throw new HttpException("You already belong to this organization", 400);
  }
  const organization = await MyGlobal.prisma.hrm_platform_organizations.create({
    data: {
      id: organizationId,
      name: props.body.name,
      description: props.body.description ?? null,
      logo_url: props.body.logo_url ?? null,
      currency: props.body.currency,
      timezone: props.body.timezone,
      fiscal_start_month: props.body.fiscal_start_month ?? 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
    ...HrmPlatformOrganizationTransformer.select(),
  });
  const ownerId = v4() as string & typeof v4 extends string
    ? string & tags.Format<"uuid">
    : never;
  const managerId = v4() as string & typeof v4 extends string
    ? string & tags.Format<"uuid">
    : never;
  const employeeId = v4() as string & typeof v4 extends string
    ? string & tags.Format<"uuid">
    : never;
  await MyGlobal.prisma.hrm_platform_roles.createMany({
    data: [
      {
        id: ownerId,
        hrm_platform_organization_id: organizationId,
        code: "owner",
        name: "Owner",
        description: "Organization owner with full administrative privileges",
        is_builtin: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: managerId,
        hrm_platform_organization_id: organizationId,
        code: "manager",
        name: "Manager",
        description:
          "Manager with employee and project management capabilities",
        is_builtin: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
      {
        id: employeeId,
        hrm_platform_organization_id: organizationId,
        code: "employee",
        name: "Employee",
        description: "Standard employee with basic access",
        is_builtin: true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    ],
  });
  await MyGlobal.prisma.hrm_platform_employees.create({
    data: {
      id: v4(),
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: organizationId,
      hrm_platform_role_id: ownerId,
      employment_type: "full-time",
      status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  const created =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(created);
}
