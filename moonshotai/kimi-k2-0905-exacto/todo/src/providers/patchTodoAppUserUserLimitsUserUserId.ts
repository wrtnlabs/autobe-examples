import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppUserLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUserLimit";
import { IPaginationBase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPaginationBase";
import { ISortOption } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOption";
import { IPageITodoAppUserLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppUserLimit";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { ITodoAppValidationRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppValidationRule";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserUserLimitsUserUserId(props: {
  user: UserPayload;
  userId: string & tags.Format<"uuid">;
  body: ITodoAppUserLimit.IRequest;
}): Promise<IPageITodoAppUserLimit.ISummary> {
  // Security check - users can only access their own limits
  if (props.user.id !== props.userId) {
    throw new HttpException("You can only view your own user limits", 403);
  }

  const { pagination, limitType, periodType, isActive } = props.body;
  const page = pagination.page;
  const limit = pagination.limit;
  const skip = (page - 1) * limit;

  // Build where condition dynamically
  const whereCondition: Record<string, unknown> = {
    user_id: props.userId,
  };

  if (limitType !== undefined && limitType !== null) {
    whereCondition.limit_type = limitType;
  }

  if (periodType !== undefined && periodType !== null) {
    whereCondition.period_type = periodType;
  }

  if (isActive !== undefined && isActive !== null) {
    whereCondition.is_active = isActive;
  }

  // Handle search if provided
  if (pagination.search) {
    whereCondition.description = {
      contains: pagination.search,
    };
  }

  // Apply sorting
  const orderBy: Record<string, "asc" | "desc"> = {};
  if (pagination.sortBy) {
    orderBy[pagination.sortBy.fieldName] = pagination.sortBy.direction;
  } else {
    orderBy.created_at = "desc";
  }

  // Fetch data and total count in parallel
  const [limits, total] = await Promise.all([
    MyGlobal.prisma.todo_app_user_limits.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        user: true,
        constraintRule: true,
      },
    }),
    MyGlobal.prisma.todo_app_user_limits.count({
      where: whereCondition,
    }),
  ]);

  // Transform results to API format
  const data = limits.map((limit) => ({
    id: limit.id as string & tags.Format<"uuid">,
    user:
      limit.user !== null && limit.user !== undefined
        ? {
            id: limit.user.id as string & tags.Format<"uuid">,
            email: limit.user.email as string & tags.Format<"email">,
            created_at: toISOStringSafe(limit.user.created_at),
            updated_at: toISOStringSafe(limit.user.updated_at),
            deleted_at: limit.user.deleted_at
              ? toISOStringSafe(limit.user.deleted_at)
              : undefined,
          }
        : undefined,
    constraintRule: limit.constraintRule
      ? {
          id: limit.constraintRule.id as string & tags.Format<"uuid">,
          rule_name: limit.constraintRule.rule_name,
          rule_key: limit.constraintRule.rule_key,
          validation_type: limit.constraintRule.validation_type,
          field_target: limit.constraintRule.field_target || undefined,
          error_message_template:
            limit.constraintRule.error_message_template || undefined,
          priority: limit.constraintRule.priority || undefined,
          is_active: limit.constraintRule.is_active,
          created_at: toISOStringSafe(limit.constraintRule.created_at),
        }
      : undefined,
    limit_value: limit.limit_value as number & tags.Type<"int32">,
    limit_type: limit.limit_type,
    period_type: limit.period_type,
    description: limit.description,
    is_active: limit.is_active,
    created_at: toISOStringSafe(limit.created_at),
    updated_at: toISOStringSafe(limit.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data,
  };
}
