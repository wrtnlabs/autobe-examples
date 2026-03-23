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

export async function getHrmPlatformAdminOrganizationsOrganizationIdSettings(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformOrganizationSetting> {
  const settings =
    await MyGlobal.prisma.hrm_platform_organization_settings.findUniqueOrThrow({
      where: {
        organization_id: props.organizationId,
        deleted_at: null,
      },
      ...HrmPlatformOrganizationSettingTransformer.select(),
    });
  return await HrmPlatformOrganizationSettingTransformer.transform(settings);
}
