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

export async function putEcommerceAdministratorSystemSettingsSettingId(props: {
  administrator: AdministratorPayload;
  settingId: string & tags.Format<"uuid">;
  body: IEcommerceSystemSetting.IUpdate;
}): Promise<IEcommerceSystemSetting> {
  // Verify setting exists and is not deleted
  const existingSetting =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: { id: props.settingId, deleted_at: null },
    });
  // Check if any fields are being updated
  const hasUpdates = Object.keys(props.body).some(
    (key) =>
      props.body[key as keyof IEcommerceSystemSetting.IUpdate] !== undefined,
  );
  if (!hasUpdates) {
    throw new HttpException("No fields to update provided", 400);
  }
  // Validate value_type consistency
  const targetValueType = props.body.value_type ?? existingSetting.value_type;
  if (
    props.body.value_type !== undefined &&
    props.body.value_type !== existingSetting.value_type
  ) {
    throw new HttpException(
      "Cannot change value_type of existing system setting",
      400,
    );
  }
  // Validate setting_value based on value_type if provided
  if (props.body.setting_value !== undefined) {
    validateSettingValue(props.body.setting_value, targetValueType);
  }
  // Build update data with only provided fields
  const updateData: Prisma.ecommerce_system_settingsUpdateInput = {
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
  };
  try {
    // Perform update
    await MyGlobal.prisma.ecommerce_system_settings.update({
      where: { id: props.settingId },
      data: updateData,
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Setting key already exists", 409);
    }
    throw error;
  }
  // Retrieve and return updated setting
  const updated =
    await MyGlobal.prisma.ecommerce_system_settings.findUniqueOrThrow({
      where: { id: props.settingId },
      ...EcommerceSystemSettingTransformer.select(),
    });
  return await EcommerceSystemSettingTransformer.transform(updated);
}
function validateSettingValue(value: string, valueType: string): void {
  switch (valueType) {
    case "string":
      // String values require no additional validation beyond non-empty check
      if (value.trim().length === 0) {
        throw new HttpException("String setting_value cannot be empty", 400);
      }
      break;
    case "boolean":
      if (value !== "true" && value !== "false") {
        throw new HttpException(
          "Boolean setting_value must be 'true' or 'false'",
          400,
        );
      }
      break;
    case "int":
      const intValue = parseInt(value, 10);
      if (
        isNaN(intValue) ||
        !Number.isInteger(intValue) ||
        intValue.toString() !== value
      ) {
        throw new HttpException(
          "Integer setting_value must be a valid integer without decimal places",
          400,
        );
      }
      break;
    case "double":
      const doubleValue = parseFloat(value);
      if (isNaN(doubleValue) || value.trim() === "") {
        throw new HttpException(
          "Double setting_value must be a valid number",
          400,
        );
      }
      break;
    case "uri":
      try {
        new URL(value);
      } catch {
        throw new HttpException("URI setting_value must be a valid URL", 400);
      }
      if (value.trim() === "") {
        throw new HttpException("URI setting_value cannot be empty", 400);
      }
      break;
    default:
      throw new HttpException(
        `Invalid value_type: ${valueType}. Must be one of: string, boolean, int, double, uri`,
        400,
      );
  }
}
