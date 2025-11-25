import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoListSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListSystemConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function postTodoListAdminTodoListSystemConfigurations(props: {
  admin: AdminPayload;
  body: ITodoListSystemConfiguration.ICreate;
}): Promise<ITodoListSystemConfiguration> {
  try {
    const now = toISOStringSafe(new Date()) as string &
      tags.Format<"date-time">;

    // Create new system configuration record
    const created =
      await MyGlobal.prisma.todo_list_system_configurations.create({
        data: {
          id: v4(),
          key: props.body.key,
          value: props.body.value,
          description: props.body.description ?? null,
          created_at: now,
          updated_at: now,
        },
      });

    return {
      key: created.key,
      value: created.value,
      description: created.description ?? null,
      created_at: created.created_at
        ? toISOStringSafe(created.created_at)
        : undefined,
      updated_at: created.updated_at
        ? toISOStringSafe(created.updated_at)
        : undefined,
    };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation on key
      throw new HttpException(
        `System configuration with key '${props.body.key}' already exists.`,
        400,
      );
    }

    throw error;
  }
}
