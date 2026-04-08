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

export async function putHrmPlatformMemberOrganizationsOrganizationId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganization.IUpdate;
}): Promise<IHrmPlatformOrganization> {
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Forbidden", 403);
  }
  const hasManagePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: {
          code: "org:manage",
          deleted_at: null,
        },
      },
    });
  if (!hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.logo_url !== undefined && {
        logo_url: props.body.logo_url,
      }),
      ...(props.body.currency !== undefined && {
        currency: props.body.currency,
      }),
      ...(props.body.timezone !== undefined && {
        timezone: props.body.timezone,
      }),
      ...(props.body.fiscal_start_month !== undefined && {
        fiscal_start_month: props.body.fiscal_start_month,
      }),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
}
