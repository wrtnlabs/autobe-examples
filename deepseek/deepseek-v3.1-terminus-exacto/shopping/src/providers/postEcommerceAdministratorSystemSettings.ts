import { IEcommerceSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSystemSetting";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceSystemSettingCollector } from "../collectors/EcommerceSystemSettingCollector";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceSystemSettingTransformer } from "../transformers/EcommerceSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceAdministratorSystemSettings(props: {
  administrator: AdministratorPayload;
  body: IEcommerceSystemSetting.ICreate;
}): Promise<IEcommerceSystemSetting> {
  // Check for duplicate setting key (excluding soft-deleted records)
  const existing = await MyGlobal.prisma.ecommerce_system_settings.findFirst({
    where: {
      setting_key: props.body.setting_key,
      deleted_at: null,
    },
  });
  if (existing) {
    throw new HttpException("Configuration setting key already exists", 409);
  }
  // Create the setting using Collector and Transformer
  const created = await MyGlobal.prisma.ecommerce_system_settings.create({
    data: await EcommerceSystemSettingCollector.collect({
      body: props.body,
    }),
    ...EcommerceSystemSettingTransformer.select(),
  });
  return await EcommerceSystemSettingTransformer.transform(created);
}
