import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putTodoAppAdminSystemSettingsSettingKey(props: {
  admin: AdminPayload;
  settingKey: string;
  body: ITodoAppSystemSetting.IUpdate;
}): Promise<ITodoAppSystemSetting> {
  // Find the setting by key
  const setting = await MyGlobal.prisma.todo_app_system_setting.findUnique({
    where: { setting_key: props.settingKey },
  });

  // Verify setting exists
  if (!setting) {
    throw new HttpException(
      `System setting with key "${props.settingKey}" not found`,
      404,
    );
  }

  // Verify setting is editable
  if (!setting.is_editable) {
    throw new HttpException(
      `System setting "${props.settingKey}" is not editable`,
      403,
    );
  }

  // Validate the new value based on setting type
  validateSettingValue(
    props.body.setting_value,
    setting.setting_type,
    setting.min_value,
    setting.max_value,
  );

  // Update the setting
  const updated = await MyGlobal.prisma.todo_app_system_setting.update({
    where: { setting_key: props.settingKey },
    data: {
      setting_value: props.body.setting_value,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      updated_at: new Date(),
    },
  });

  // Convert to API response type
  return {
    id: updated.id as string & tags.Format<"uuid">,
    setting_key: updated.setting_key,
    setting_value: updated.setting_value,
    setting_type: updated.setting_type,
    setting_category: updated.setting_category,
    description: updated.description === null ? undefined : updated.description,
    default_value:
      updated.default_value === null ? undefined : updated.default_value,
    min_value: updated.min_value === null ? undefined : updated.min_value,
    max_value: updated.max_value === null ? undefined : updated.max_value,
    is_editable: updated.is_editable,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
  };
}

function validateSettingValue(
  value: string,
  type: string,
  minValue: string | null,
  maxValue: string | null,
): void {
  if (type === "integer") {
    // Validate integer format
    if (!/^-?\d+$/.test(value)) {
      throw new HttpException(
        `Setting value must be a valid integer, got: "${value}"`,
        400,
      );
    }

    const numValue = parseInt(value, 10);

    // Validate min constraint
    if (minValue !== null) {
      const min = parseInt(minValue, 10);
      if (numValue < min) {
        throw new HttpException(
          `Setting value must be >= ${min}, got: ${numValue}`,
          400,
        );
      }
    }

    // Validate max constraint
    if (maxValue !== null) {
      const max = parseInt(maxValue, 10);
      if (numValue > max) {
        throw new HttpException(
          `Setting value must be <= ${max}, got: ${numValue}`,
          400,
        );
      }
    }
  } else if (type === "decimal") {
    // Validate decimal format
    if (!/^-?\d+(\.\d+)?$/.test(value)) {
      throw new HttpException(
        `Setting value must be a valid decimal, got: "${value}"`,
        400,
      );
    }

    const numValue = parseFloat(value);

    // Validate min constraint
    if (minValue !== null) {
      const min = parseFloat(minValue);
      if (numValue < min) {
        throw new HttpException(
          `Setting value must be >= ${min}, got: ${numValue}`,
          400,
        );
      }
    }

    // Validate max constraint
    if (maxValue !== null) {
      const max = parseFloat(maxValue);
      if (numValue > max) {
        throw new HttpException(
          `Setting value must be <= ${max}, got: ${numValue}`,
          400,
        );
      }
    }
  } else if (type === "boolean") {
    // Validate boolean format (must be "true" or "false")
    if (value !== "true" && value !== "false") {
      throw new HttpException(
        `Setting value must be "true" or "false", got: "${value}"`,
        400,
      );
    }
  } else if (type === "string") {
    // For string type, any non-empty string is valid
    if (typeof value !== "string") {
      throw new HttpException(
        `Setting value must be a string, got: ${typeof value}`,
        400,
      );
    }
  }
}
