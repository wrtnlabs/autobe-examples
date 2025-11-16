import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemConfig";
import { TodoadminPayload } from "../decorators/payload/TodoadminPayload";

export async function postTodoAppTodoAdminSystemConfigs(props: {
  todoAdmin: TodoadminPayload;
  body: ITodoAppSystemConfig.ICreate;
}): Promise<ITodoAppSystemConfig> {
  // Enforce uniqueness on (scope, key) among non-deleted configs
  const existing = await MyGlobal.prisma.todo_app_system_configs.findFirst({
    where: {
      scope: props.body.scope,
      key: props.body.key,
      deleted_at: null,
    },
  });

  if (existing !== null) {
    throw new HttpException(
      "A system configuration with the same scope and key already exists.",
      409,
    );
  }

  const now = new Date();

  try {
    const created = await MyGlobal.prisma.todo_app_system_configs.create({
      data: {
        id: v4(),
        scope: props.body.scope,
        key: props.body.key,
        value: props.body.value,
        description: props.body.description,
        is_active:
          props.body.is_active !== undefined ? props.body.is_active : true,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });

    const deletedAtValue = created.deleted_at;
    const descriptionValue = created.description;

    return {
      id: created.id,
      scope: created.scope,
      key: created.key,
      value: created.value,
      description: descriptionValue === null ? undefined : descriptionValue,
      is_active: created.is_active,
      created_at: toISOStringSafe(created.created_at),
      updated_at: toISOStringSafe(created.updated_at),
      deleted_at:
        deletedAtValue === null ? null : toISOStringSafe(deletedAtValue),
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation on (scope, key)
      throw new HttpException(
        "A system configuration with the same scope and key already exists.",
        409,
      );
    }

    throw error;
  }
}
