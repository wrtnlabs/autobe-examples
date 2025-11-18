import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function postTodoAppAdminUserSystemSettings(props: {
  adminUser: AdminuserPayload;
  body: ITodoAppSystemSetting.ICreate;
}): Promise<ITodoAppSystemSetting> {
  const { body } = props;

  // Supported semantic types for system setting values
  const supportedTypes: readonly string[] = [
    "int",
    "boolean",
    "string",
    "double",
  ];

  // Business-level validation for semantic type
  if (!supportedTypes.includes(body.type)) {
    throw new HttpException(
      `Unsupported system setting type: ${body.type}. Supported types are: ${supportedTypes.join(", ")}`,
      400,
    );
  }

  // Business-level validation that value conforms to declared type
  const typeName = body.type;
  const rawValue = body.value;

  if (typeName === "int") {
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed)) {
      throw new HttpException(
        "Value must be a valid integer string for type 'int'",
        400,
      );
    }
  } else if (typeName === "double") {
    const parsed = Number(rawValue);
    if (Number.isNaN(parsed)) {
      throw new HttpException(
        "Value must be a valid number string for type 'double'",
        400,
      );
    }
  } else if (typeName === "boolean") {
    if (rawValue !== "true" && rawValue !== "false") {
      throw new HttpException(
        "Value must be either 'true' or 'false' for type 'boolean'",
        400,
      );
    }
  }

  // Enforce uniqueness of the key before attempting to create
  const existing = await MyGlobal.prisma.todo_app_system_settings.findUnique({
    where: {
      key: body.key,
    },
  });

  if (existing !== null) {
    throw new HttpException(
      `System setting with key '${body.key}' already exists`,
      409,
    );
  }

  // Consistent timestamp generation without exposing Date in types
  const nowIso = toISOStringSafe(new Date());

  try {
    const created = await MyGlobal.prisma.todo_app_system_settings.create({
      data: {
        id: v4(),
        key: body.key,
        value: body.value,
        type: body.type,
        description: body.description ?? null,
        group: body.group ?? null,
        enabled: body.enabled,
        created_at: nowIso,
        updated_at: nowIso,
        deleted_at: null,
      },
    });

    const createdAtIso = toISOStringSafe(created.created_at);
    const updatedAtIso = toISOStringSafe(created.updated_at);
    const deletedAtIso =
      created.deleted_at === null ? null : toISOStringSafe(created.deleted_at);

    const result: ITodoAppSystemSetting = {
      id: created.id,
      key: created.key,
      value: created.value,
      type: created.type,
      description: created.description ?? null,
      group: created.group ?? null,
      enabled: created.enabled,
      created_at: createdAtIso,
      updated_at: updatedAtIso,
      deleted_at: deletedAtIso,
    };

    return result;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      // Unique constraint violation (race condition on key)
      throw new HttpException(
        `System setting with key '${body.key}' already exists`,
        409,
      );
    }

    throw new HttpException("Failed to create system setting", 500);
  }
}
