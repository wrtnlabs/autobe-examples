import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformOrganizationSettingTransformer } from "../transformers/HrmPlatformOrganizationSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformAdminOrganizationsOrganizationIdSettings(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IHrmPlatformOrganizationSetting.IUpdate;
}): Promise<IHrmPlatformOrganizationSetting> {
  // Verify organization exists and is not soft-deleted
  await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
  });
  // Admins are platform-wide and can manage all organizations
  // No need to check organization membership
  // Upsert organization settings
  const settings =
    await MyGlobal.prisma.hrm_platform_organization_settings.upsert({
      where: {
        organization_id: props.organizationId,
      },
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
      ...HrmPlatformOrganizationSettingTransformer.select(),
    });
  return await HrmPlatformOrganizationSettingTransformer.transform(settings);
}
