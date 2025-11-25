import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function postTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.ICreate;
}): Promise<ITodoAppConfiguration> {
  // Check if config_key already exists
  const existingConfig =
    await MyGlobal.prisma.todo_app_configurations.findFirst({
      where: {
        config_key: props.body.config_key,
        deleted_at: null,
      },
    });

  if (existingConfig) {
    throw new HttpException(
      `Configuration with key '${props.body.config_key}' already exists`,
      409,
    );
  }

  const now = toISOStringSafe(new Date());
  const configId = v4();

  const created = await MyGlobal.prisma.todo_app_configurations.create({
    data: {
      id: configId,
      config_key: props.body.config_key,
      name: props.body.name,
      description: props.body.description,
      data_type: props.body.data_type,
      default_value: props.body.default_value,
      validation_rules: props.body.validation_rules ?? null,
      category: props.body.category,
      is_sensitive: props.body.is_sensitive,
      is_required: props.body.is_required,
      version: 1,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: created.id as string & tags.Format<"uuid">,
    config_key: created.config_key,
    name: created.name,
    description: created.description,
    data_type: created.data_type,
    default_value: created.default_value,
    validation_rules:
      created.validation_rules === null ? undefined : created.validation_rules,
    category: created.category,
    is_sensitive: created.is_sensitive,
    is_required: created.is_required,
    version: created.version,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at
      ? toISOStringSafe(created.deleted_at)
      : undefined,
  };
}
