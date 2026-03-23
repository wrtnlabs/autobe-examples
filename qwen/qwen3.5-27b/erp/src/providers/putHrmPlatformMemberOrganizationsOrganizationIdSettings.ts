import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformOrganizationSettingTransformer } from "../transformers/HrmPlatformOrganizationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberOrganizationsOrganizationIdSettings(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationSetting.IUpdate;
}): Promise<IHrmPlatformOrganizationSetting> {
  // Verify organization exists and is not soft-deleted
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: {
        id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        owner_id: true,
      },
    });
  // Verify member belongs to organization and has permission (owner or admin role)
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: props.organizationId,
      deleted_at: null,
      status: "active",
    },
    select: {
      id: true,
      role_id: true,
      role: {
        select: {
          name: true,
        },
      },
    },
  });
  if (employee === null) {
    throw new HttpException("You do not have access to this organization", 403);
  }
  // Check if member is owner or has admin role
  const isOwner = organization.owner_id === props.member.id;
  const isAdmin =
    employee.role.name === "Admin" || employee.role.name === "Owner";
  if (!isOwner && !isAdmin) {
    throw new HttpException(
      "You do not have permission to update organization settings",
      403,
    );
  }
  // Get or create organization settings
  let settings =
    await MyGlobal.prisma.hrm_platform_organization_settings.findUnique({
      where: {
        organization_id: props.organizationId,
      },
    });
  if (settings === null) {
    // Create settings if not exists
    settings = await MyGlobal.prisma.hrm_platform_organization_settings.create({
      data: {
        id: v4(),
        organization_id: props.organizationId,
        currency: props.body.currency ?? "USD",
        timezone: props.body.timezone ?? "UTC",
        fiscal_year_start_month: props.body.fiscal_year_start_month ?? 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Build update data
  const updateData: Prisma.hrm_platform_organization_settingsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.currency !== undefined && { currency: props.body.currency }),
    ...(props.body.timezone !== undefined && { timezone: props.body.timezone }),
    ...(props.body.fiscal_year_start_month !== undefined && {
      fiscal_year_start_month: props.body.fiscal_year_start_month,
    }),
  };
  // Update and fetch with transformer select
  const updatedSettings =
    await MyGlobal.prisma.hrm_platform_organization_settings.update({
      where: {
        id: settings.id,
      },
      data: updateData,
      ...HrmPlatformOrganizationSettingTransformer.select(),
    });
  return await HrmPlatformOrganizationSettingTransformer.transform(
    updatedSettings,
  );
}
