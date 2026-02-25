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
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { EcommerceSystemSettingTransformer } from "../transformers/EcommerceSystemSettingTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceSuperAdministratorSystemSettings(props: {
  superAdministrator: SuperadministratorPayload;
  body: IEcommerceSystemSetting.ICreate;
}): Promise<IEcommerceSystemSetting> {
  const existingSetting =
    await MyGlobal.prisma.ecommerce_system_settings.findUnique({
      where: { setting_key: props.body.setting_key, deleted_at: null },
    });
  if (existingSetting !== null) {
    throw new HttpException("Setting key already exists", 400);
  }
  validateSettingValue(props.body.value_type, props.body.setting_value);
  const data = await EcommerceSystemSettingCollector.collect({
    body: props.body,
  });
  const createdSetting = await MyGlobal.prisma.ecommerce_system_settings.create(
    {
      data: data,
      ...EcommerceSystemSettingTransformer.select(),
    },
  );
  const result =
    await EcommerceSystemSettingTransformer.transform(createdSetting);
  return result;
}
function validateSettingValue(valueType: string, settingValue: string): void {
  switch (valueType) {
    case "string":
      // Any string is valid
      break;
    case "boolean":
      if (!["true", "false"].includes(settingValue.toLowerCase())) {
        throw new HttpException(
          "Invalid boolean value: must be 'true' or 'false'",
          400,
        );
      }
      break;
    case "int":
      if (!/^-?\d+$/.test(settingValue)) {
        throw new HttpException("Invalid integer value", 400);
      }
      break;
    case "double":
      if (!/^-?\d+(\.\d+)?$/.test(settingValue)) {
        throw new HttpException("Invalid double value", 400);
      }
      break;
    case "uri":
      try {
        new URL(settingValue);
      } catch {
        throw new HttpException("Invalid URI value", 400);
      }
      break;
    default:
      throw new HttpException(`Invalid value type: ${valueType}`, 400);
  }
}
