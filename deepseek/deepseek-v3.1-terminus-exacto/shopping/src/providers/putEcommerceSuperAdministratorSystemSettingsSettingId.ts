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

export async function putEcommerceSuperAdministratorSystemSettingsSettingId(props: {
  superAdministrator: SuperadministratorPayload;
  settingId: string & tags.Format<"uuid">;
  body: IEcommerceSystemSetting.IUpdate;
}): Promise<IEcommerceSystemSetting> {
  // Verify setting exists and is not deleted
  const existingSetting =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: { id: props.settingId, deleted_at: null },
    });
  // Validate value_type consistency
  if (
    props.body.value_type !== undefined &&
    props.body.value_type !== existingSetting.value_type
  ) {
    throw new HttpException(
      "Cannot change value_type of existing setting",
      400,
    );
  }
  // Check setting_key uniqueness if being updated
  if (
    props.body.setting_key !== undefined &&
    props.body.setting_key !== existingSetting.setting_key
  ) {
    const existingKey =
      await MyGlobal.prisma.ecommerce_system_settings.findUnique({
        where: { setting_key: props.body.setting_key, deleted_at: null },
      });
    if (existingKey !== null) {
      throw new HttpException("Setting key already exists", 400);
    }
  }
  const valueType = props.body.value_type ?? existingSetting.value_type;
  // Validate setting_value based on value_type
  if (props.body.setting_value !== undefined) {
    if (props.body.setting_value.trim() === "") {
      throw new HttpException("Setting value cannot be empty", 400);
    }
    switch (valueType) {
      case "boolean":
        if (
          props.body.setting_value !== "true" &&
          props.body.setting_value !== "false"
        ) {
          throw new HttpException(
            "Invalid boolean value. Must be 'true' or 'false'",
            400,
          );
        }
        break;
      case "int":
        if (!/^-?\d+$/.test(props.body.setting_value)) {
          throw new HttpException(
            "Invalid integer value. Must contain only digits",
            400,
          );
        }
        break;
      case "double":
        if (!/^-?\d+(\.\d+)?$/.test(props.body.setting_value)) {
          throw new HttpException(
            "Invalid double value. Must be a valid number",
            400,
          );
        }
        break;
      case "uri":
        try {
          // Basic URI validation - must start with protocol
          const url = new URL(props.body.setting_value);
          if (
            !url.protocol ||
            !["http:", "https:", "ftp:", "mailto:"].includes(url.protocol)
          ) {
            throw new Error("Invalid protocol");
          }
        } catch {
          throw new HttpException(
            "Invalid URI format. Must be a valid URL with protocol",
            400,
          );
        }
        break;
      case "string":
        // No additional validation needed for strings
        break;
      default:
        throw new HttpException(`Unsupported value_type: ${valueType}`, 400);
    }
  }
  // Build update data with type safety
  const updateData = {
    ...(props.body.setting_key !== undefined && {
      setting_key: props.body.setting_key,
    }),
    ...(props.body.value_type !== undefined && {
      value_type: props.body.value_type,
    }),
    ...(props.body.setting_value !== undefined && {
      setting_value: props.body.setting_value,
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    updated_at: new Date(),
  } satisfies Prisma.ecommerce_system_settingsUpdateInput;
  const updatedSetting = await MyGlobal.prisma.ecommerce_system_settings.update(
    {
      where: { id: props.settingId },
      data: updateData,
      ...EcommerceSystemSettingTransformer.select(),
    },
  );
  return await EcommerceSystemSettingTransformer.transform(updatedSetting);
}
