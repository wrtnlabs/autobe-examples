import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformOrganizationTransformer } from "../transformers/HrmPlatformOrganizationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminOrganizationsOrganizationId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganization.IUpdate;
}): Promise<IHrmPlatformOrganization> {
  // Find the organization (throws 404 if not found)
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      select: { id: true, deleted_at: true },
    });
  if (organization.deleted_at !== null) {
    throw new HttpException("Organization is deleted", 404);
  }
  // Build organization update data
  const organizationUpdateData: Prisma.hrm_platform_organizationsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    organizationUpdateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    organizationUpdateData.description = props.body.description;
  }
  // Update organization
  await MyGlobal.prisma.hrm_platform_organizations.update({
    where: { id: props.organizationId },
    data: organizationUpdateData,
  });
  // Upsert organization settings if any settings fields provided
  if (
    props.body.currency !== undefined ||
    props.body.timezone !== undefined ||
    props.body.fiscal_year_start_month !== undefined
  ) {
    await MyGlobal.prisma.hrm_platform_organization_settings.upsert({
      where: { organization_id: props.organizationId },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: props.organizationId,
        currency: props.body.currency ?? "USD",
        timezone: props.body.timezone ?? "UTC",
        fiscal_year_start_month: props.body.fiscal_year_start_month ?? 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        ...(props.body.currency !== undefined && {
          currency: props.body.currency,
        }),
        ...(props.body.timezone !== undefined && {
          timezone: props.body.timezone,
        }),
        ...(props.body.fiscal_year_start_month !== undefined && {
          fiscal_year_start_month: props.body.fiscal_year_start_month,
        }),
        updated_at: new Date(),
      },
    });
  }
  // Upsert organization logo if image_url provided
  if (props.body.image_url !== undefined) {
    await MyGlobal.prisma.hrm_platform_organization_logos.upsert({
      where: { hrm_platform_organization_id: props.organizationId },
      create: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_organization_id: props.organizationId,
        image_url: props.body.image_url,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      update: {
        image_url: props.body.image_url,
        updated_at: new Date(),
      },
    });
  }
  // Query the updated organization with all relations
  const updated =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: props.organizationId },
      ...HrmPlatformOrganizationTransformer.select(),
    });
  return await HrmPlatformOrganizationTransformer.transform(updated);
}
