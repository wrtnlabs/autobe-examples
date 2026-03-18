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
  // 1. Find organization and verify it exists and is not soft-deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId, deleted_at: null },
      select: { id: true },
    });
  // 2. Verify member has org:manage permission for this organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      hrm_platform_role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission: {
          code: "org:manage",
          deleted_at: null,
        },
        deleted_at: null,
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate name uniqueness if provided
  if (props.body.name !== undefined) {
    const duplicate =
      await MyGlobal.prisma.hrm_platform_organizations.findFirst({
        where: {
          name: props.body.name,
          id: { not: props.organizationId },
          deleted_at: null,
        },
        select: { id: true },
      });
    if (duplicate) {
      throw new HttpException("Organization name must be unique", 400);
    }
  }
  // 4. Validate fiscal_start_month if provided
  if (
    props.body.fiscal_start_month !== undefined &&
    (props.body.fiscal_start_month < 1 || props.body.fiscal_start_month > 12)
  ) {
    throw new HttpException("fiscal_start_month must be between 1 and 12", 400);
  }
  // 5. Build update data with only non-undefined fields
  const updateData: Prisma.hrm_platform_organizationsUpdateInput = {
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.logo_url !== undefined && { logo_url: props.body.logo_url }),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
    ...(props.body.fiscal_start_month !== undefined && {
      fiscal_start_month: props.body.fiscal_start_month,
    }),
    updated_at: new Date(),
  };
  // 6. Execute update
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: updateData,
  });
  // 7. Fetch and transform updated organization
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
}
