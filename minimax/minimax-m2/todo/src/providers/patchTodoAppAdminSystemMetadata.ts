import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemMetadata";
import { IPageITodoAppSystemMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemMetadata";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppAdminSystemMetadata(props: {
  admin: AdminPayload;
  body: ITodoAppSystemMetadata.IRequest;
}): Promise<IPageITodoAppSystemMetadata.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;

  // Build dynamic where conditions based on filter criteria
  const whereConditions: Record<string, unknown> = {
    deleted_at: null, // Only return non-deleted records
  };

  // Apply filtering conditions
  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  if (props.body.environment) {
    whereConditions.environment_scope = props.body.environment;
  }

  if (props.body.is_active !== undefined && props.body.is_active !== null) {
    whereConditions.is_active = props.body.is_active;
  }

  if (props.body.data_type) {
    whereConditions.config_type = props.body.data_type;
  }

  if (
    props.body.is_system_level !== undefined &&
    props.body.is_system_level !== null
  ) {
    whereConditions.is_system_config = props.body.is_system_level;
  }

  if (props.body.search) {
    whereConditions.config_key = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }

  // Determine sort order
  let orderBy: Prisma.todo_app_system_metadataOrderByWithRelationInput = {
    created_at: "desc",
  };

  if (props.body.order_by && props.body.order_direction) {
    const direction = props.body.order_direction === "desc" ? "desc" : "asc";

    switch (props.body.order_by) {
      case "config_key":
        orderBy = { config_key: direction };
        break;
      case "category":
        orderBy = { category: direction };
        break;
      case "created_at":
        orderBy = { created_at: direction };
        break;
      case "updated_at":
        orderBy = { updated_at: direction };
        break;
      default:
        orderBy = { created_at: "desc" };
    }
  }

  // Execute parallel queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_system_metadata.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_system_metadata.count({
      where: whereConditions,
    }),
  ]);

  // Map results to API format with proper type conversions
  const mappedData = data.map((record) => ({
    id: record.id,
    config_key: record.config_key,
    config_value: record.config_value,
    config_type: record.config_type,
    category: record.category,
    description: record.description,
    is_active: record.is_active,
    is_system_config: record.is_system_config,
    environment_scope: record.environment_scope,
    created_by_member_id: record.created_by_member_id ?? undefined,
    created_by_administrator_id:
      record.created_by_administrator_id ?? undefined,
    validation_schema: record.validation_schema ?? undefined,
    default_value: record.default_value ?? undefined,
    min_value: record.min_value ?? undefined,
    max_value: record.max_value ?? undefined,
    allowed_values: record.allowed_values ?? undefined,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at
      ? toISOStringSafe(record.deleted_at)
      : undefined,
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(total / limit);

  return {
    data: mappedData,
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: totalPages,
    },
  };
}
