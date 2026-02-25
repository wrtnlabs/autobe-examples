import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceSystemSettingTransformer } from "../transformers/EcommerceSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSuperAdministratorSystemSettingsSettingId(props: {
  superAdministrator: SuperadministratorPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSystemSetting> {
  const setting =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: {
        id: props.settingId,
        deleted_at: null,
      },
      ...EcommerceSystemSettingTransformer.select(),
    });
  return await EcommerceSystemSettingTransformer.transform(setting);
}
