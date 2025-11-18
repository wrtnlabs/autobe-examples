import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";

export async function putTodoAppUserConfigurationsConfigKey(props: {
  configKey: string;
  body: ITodoAppConfiguration.IUpdate;
}): Promise<ITodoAppConfiguration> {
  // Find existing configuration
  const existing = await MyGlobal.prisma.todo_app_configurations.findUnique({
    where: { config_key: props.configKey },
  });

  if (!existing) {
    throw new HttpException("Configuration not found", 404);
  }

  // Validate default_value if being updated
  if (props.body.default_value !== undefined) {
    try {
      // Enhanced validation based on data_type
      switch (existing.data_type) {
        case "boolean":
          if (
            props.body.default_value !== "true" &&
            props.body.default_value !== "false"
          ) {
            throw new Error("Invalid boolean value");
          }
          break;
        case "number":
          const numValue = Number(props.body.default_value);
          if (isNaN(numValue) || !isFinite(numValue)) {
            throw new Error("Invalid number value");
          }
          break;
        case "json":
          JSON.parse(props.body.default_value);
          break;
        case "array":
          // Validate array format
          const arrayValue = JSON.parse(props.body.default_value);
          if (!Array.isArray(arrayValue)) {
            throw new Error("Invalid array format");
          }
          break;
        case "object":
          // Validate object format
          const objectValue = JSON.parse(props.body.default_value);
          if (
            typeof objectValue !== "object" ||
            objectValue === null ||
            Array.isArray(objectValue)
          ) {
            throw new Error("Invalid object format");
          }
          break;
        default:
          // String and other types don't need complex validation
          break;
      }
    } catch (error) {
      // Type-narrow the error before accessing message property
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      throw new HttpException(
        `Invalid default_value for data_type '${existing.data_type}': ${errorMessage}`,
        400,
      );
    }
  }

  // Update configuration with version increment
  const updated = await MyGlobal.prisma.todo_app_configurations.update({
    where: { config_key: props.configKey },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      ...(props.body.default_value !== undefined && {
        default_value: props.body.default_value,
      }),
      ...(props.body.validation_rules !== undefined && {
        validation_rules:
          props.body.validation_rules === null
            ? null
            : props.body.validation_rules,
      }),
      ...(props.body.category !== undefined && {
        category: props.body.category,
      }),
      ...(props.body.is_sensitive !== undefined && {
        is_sensitive: props.body.is_sensitive,
      }),
      ...(props.body.is_required !== undefined && {
        is_required: props.body.is_required,
      }),
      version: existing.version + 1,
      updated_at: toISOStringSafe(new Date()),
    },
  });

  return {
    id: updated.id as string & tags.Format<"uuid">,
    config_key: updated.config_key,
    name: updated.name,
    description: updated.description,
    data_type: updated.data_type,
    default_value: updated.default_value,
    validation_rules:
      updated.validation_rules === null ? undefined : updated.validation_rules,
    category: updated.category,
    is_sensitive: updated.is_sensitive,
    is_required: updated.is_required,
    version: updated.version,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at: updated.deleted_at
      ? toISOStringSafe(updated.deleted_at)
      : undefined,
  };
}
