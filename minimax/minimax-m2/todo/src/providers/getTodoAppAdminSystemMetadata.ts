import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemMetadata";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getTodoAppAdminSystemMetadata(props: {
  admin: AdminPayload;
}): Promise<IPageITodoAppSystemMetadata.ISummary> {
  // Default pagination values
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_system_metadata.findMany({
      where: {
        deleted_at: null, // Only return non-deleted records
        is_active: true, // Only return active configurations
      },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_system_metadata.count({
      where: {
        deleted_at: null,
        is_active: true,
      },
    }),
  ]);

  return {
    data: data.map((metadata) => ({
      id: metadata.id,
      config_key: metadata.config_key,
      config_value: metadata.config_value,
      config_type: metadata.config_type,
      category: metadata.category,
      description: metadata.description,
      is_active: metadata.is_active,
      is_system_config: metadata.is_system_config,
      environment_scope: metadata.environment_scope,
      created_by_member_id:
        (metadata.created_by_member_id satisfies string | null as
          | string
          | null) ?? undefined,
      created_by_administrator_id:
        (metadata.created_by_administrator_id satisfies string | null as
          | string
          | null) ?? undefined,
      validation_schema: metadata.validation_schema ?? undefined,
      default_value: metadata.default_value ?? undefined,
      min_value: metadata.min_value ?? undefined,
      max_value: metadata.max_value ?? undefined,
      allowed_values: metadata.allowed_values ?? undefined,
      created_at: toISOStringSafe(metadata.created_at),
      updated_at: toISOStringSafe(metadata.updated_at),
      deleted_at: metadata.deleted_at
        ? toISOStringSafe(metadata.deleted_at)
        : undefined,
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
