import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const { body } = props;

  // Parse pagination parameters with defaults
  const page = Math.max(1, body.page ?? 1);
  const limit = Math.max(1, Math.min(100, body.limit ?? 20));
  const skip = (page - 1) * limit;

  // Build WHERE condition with proper null/undefined handling
  const where = {
    // Search filter - simple contains for database compatibility
    ...(body.search &&
      body.search.trim().length > 0 && {
        OR: [
          { config_key: { contains: body.search } },
          { description: { contains: body.search } },
        ],
      }),

    // Exact match filters with proper null checks
    ...(body.config_key !== undefined &&
      body.config_key !== null &&
      body.config_key.trim().length > 0 && {
        config_key: body.config_key,
      }),
    ...(body.data_type !== undefined &&
      body.data_type !== null &&
      body.data_type.trim().length > 0 && {
        data_type: body.data_type,
      }),
    ...(body.status !== undefined &&
      body.status !== null &&
      body.status.trim().length > 0 && {
        status: body.status,
      }),
  };

  // Build orderBy conditionally to avoid type errors
  const orderBy = (() => {
    if (body.order_by === "config_key") {
      return {
        config_key:
          body.order_direction === "asc" ? ("asc" as const) : ("desc" as const),
      };
    }
    if (body.order_by === "updated_at") {
      return {
        updated_at:
          body.order_direction === "asc" ? ("asc" as const) : ("desc" as const),
      };
    }
    // Default: created_at descending
    return {
      created_at:
        body.order_direction === "asc" ? ("asc" as const) : ("desc" as const),
    };
  })();

  try {
    // Execute paginated query
    const [records, total] = await Promise.all([
      MyGlobal.prisma.todo_app_configurations.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        select: {
          id: true,
          config_key: true,
          config_value: true,
          data_type: true,
          status: true,
          created_at: true,
          updated_at: true,
        },
      }),
      MyGlobal.prisma.todo_app_configurations.count({ where }),
    ]);

    // Convert records to API response format with proper date handling
    const data = records.map((record) => ({
      id: record.id as string & tags.Format<"uuid">,
      config_key: record.config_key,
      config_value: record.config_value,
      data_type: record.data_type,
      status: record.status,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
    }));

    // Calculate pagination metadata with number type conversion
    const pagination = {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination;

    return {
      pagination,
      data,
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve configuration settings", 500);
  }
}
