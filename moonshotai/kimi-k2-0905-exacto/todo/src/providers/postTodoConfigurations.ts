import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoConfiguration";

/**
 * Creates a new configuration setting for the todo application.
 *
 * This endpoint enables administrators to add system-wide configuration
 * parameters that control various aspects of the application behavior.
 *
 * @param props - Contains the configuration creation data including: - key:
 *   Unique identifier for the configuration - value: Configuration value to
 *   store - type: Data type of the value (string, number, boolean, json) -
 *   description: Human-readable description - is_system: Whether this is a
 *   system-level configuration
 * @returns The newly created configuration setting with all properties
 * @throws HttpException - When configuration key already exists (409)
 *
 *   The system supports different configuration types and includes:
 *
 *   - Automatic timestamp management for created_at/updated_at
 *   - Soft deletion with deleted_at field (null)
 *   - Unique key constraint enforcement
 *   - System-level protection through is_system flag
 */
export async function postTodoConfigurations(props: {
  body: ITodoConfiguration.ICreate;
}): Promise<ITodoConfiguration> {
  const { body } = props;

  // Generate UUID for new configuration - required since schema lacks @default()
  const configId = v4() as string & tags.Format<"uuid">;

  // Convert current timestamp to ISO string format
  const now = toISOStringSafe(new Date());

  try {
    // Insert new configuration with all required fields
    const created = await MyGlobal.prisma.todo_configurations.create({
      data: {
        id: configId, // Must provide ID since no @default() in schema
        key: body.key,
        value: body.value,
        description: body.description ?? null,
        type: body.type,
        is_system: body.is_system,
        created_at: now,
        updated_at: now,
        deleted_at: null, // Starts non-deleted
      },
    });

    // Return configuration with proper date formatting
    // Note: Prisma returns these as ISO strings, but normalize for type safety
    return {
      id: created.id as string & tags.Format<"uuid">,
      key: created.key,
      value: created.value,
      description: created.description,
      type: created.type,
      is_system: created.is_system,
      created_at: toISOStringSafe(new Date(created.created_at)),
      updated_at: toISOStringSafe(new Date(created.updated_at)),
      deleted_at: created.deleted_at
        ? toISOStringSafe(new Date(created.deleted_at))
        : null,
    };
  } catch (error) {
    // Handle unique constraint violation on key field
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException(
        `Configuration key '${body.key}' already exists`,
        409,
      );
    }

    // Handle other database errors
    throw new HttpException(
      `Failed to create configuration: ${error instanceof Error ? error.message : "Unknown error"}`,
      500,
    );
  }
}
