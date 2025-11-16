import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";
import { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchTodoAppSystemSettings(props: {
  admin: AdminPayload;
  body: ITodoAppSystemSetting.IRequest;
}): Promise<IPageITodoAppSystemSetting.ISummary> {
  // Extract pagination parameters with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;

  // Build dynamic where clause based on filters
  const whereCondition: Record<string, unknown> = {};

  // Filter by setting_key (partial match)
  if (props.body.setting_key) {
    whereCondition.setting_key = {
      contains: props.body.setting_key,
    };
  }

  // Filter by setting_type
  if (props.body.setting_type) {
    whereCondition.setting_type = props.body.setting_type;
  }

  // Filter by setting_category
  if (props.body.setting_category) {
    whereCondition.setting_category = props.body.setting_category;
  }

  // Filter by created_at date range
  if (props.body.created_at_from || props.body.created_at_to) {
    whereCondition.created_at = {};
    if (props.body.created_at_from) {
      (whereCondition.created_at as Record<string, unknown>).gte =
        props.body.created_at_from;
    }
    if (props.body.created_at_to) {
      (whereCondition.created_at as Record<string, unknown>).lte =
        props.body.created_at_to;
    }
  }

  // Filter by updated_at date range
  if (props.body.updated_at_from || props.body.updated_at_to) {
    whereCondition.updated_at = {};
    if (props.body.updated_at_from) {
      (whereCondition.updated_at as Record<string, unknown>).gte =
        props.body.updated_at_from;
    }
    if (props.body.updated_at_to) {
      (whereCondition.updated_at as Record<string, unknown>).lte =
        props.body.updated_at_to;
    }
  }

  // Determine sort field with default
  const validSortFields = [
    "setting_key",
    "setting_type",
    "setting_category",
    "created_at",
    "updated_at",
  ] as const;
  const sortField =
    props.body.order_by && validSortFields.includes(props.body.order_by)
      ? props.body.order_by
      : "setting_key";

  // Determine sort direction
  const sortDirection = props.body.order === "desc" ? "desc" : "asc";

  // Execute concurrent queries for efficiency
  const [settings, total] = await Promise.all([
    MyGlobal.prisma.todo_app_system_setting.findMany({
      where: whereCondition,
      select: {
        id: true,
        setting_key: true,
        setting_value: true,
        setting_type: true,
        setting_category: true,
        updated_at: true,
      },
      skip,
      take: limit,
      orderBy: {
        [sortField]: sortDirection,
      },
    }),
    MyGlobal.prisma.todo_app_system_setting.count({
      where: whereCondition,
    }),
  ]);

  // Calculate pagination metadata
  const pages = Math.ceil(total / limit);

  // Transform results to API format
  const data: ITodoAppSystemSetting.ISummary[] = settings.map((setting) => ({
    id: setting.id,
    setting_key: setting.setting_key,
    setting_value: setting.setting_value,
    setting_type: setting.setting_type,
    setting_category: setting.setting_category,
    updated_at: toISOStringSafe(setting.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages,
    },
    data,
  };
}
