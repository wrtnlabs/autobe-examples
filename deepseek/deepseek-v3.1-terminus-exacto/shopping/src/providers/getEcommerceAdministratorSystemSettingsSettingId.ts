import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSystemSettingTransformer } from "../transformers/EcommerceSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceAdministratorSystemSettingsSettingId(props: {
  administrator: AdministratorPayload;
  settingId: string & tags.Format<"uuid">;
}): Promise<IEcommerceSystemSetting> {
  // Verify administrator exists (defensive check)
  await MyGlobal.prisma.ecommerce_administrators.findUniqueOrThrow({
    where: { id: props.administrator.id, deleted_at: null },
  });
  const setting =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: { id: props.settingId },
      ...EcommerceSystemSettingTransformer.select(),
    });
  return await EcommerceSystemSettingTransformer.transform(setting);
}
