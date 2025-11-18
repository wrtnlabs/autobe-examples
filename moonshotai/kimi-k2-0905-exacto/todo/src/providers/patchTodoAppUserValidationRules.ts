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
import { IPageITodoAppValidationRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppValidationRule";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppValidationRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppValidationRule";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserValidationRules(props: {
  user: UserPayload;
  body: ITodoAppUserLimit.IRequest;
}): Promise<IPageITodoAppValidationRule.ISummary> {
  const { pagination, limitType, periodType, isActive } = props.body;

  // Extract pagination parameters
  const page = pagination.page ?? 1;
  const limit = pagination.limit ?? 20;
  const skip = (page - 1) * limit;
  const search = pagination.search;
  const sortBy = pagination.sortBy;
  const sortOrder = pagination.sortOrder ?? "asc";

  // Build where conditions
  const where: any = {};

  // Apply limitType filter (maps to validation_type)
  if (limitType !== undefined && limitType !== null) {
    where.validation_type = limitType;
  }

  // Apply search filter (matches against rule_name, rule_key, field_target)
  if (search) {
    where.OR = [
      { rule_name: { contains: search } },
      { rule_key: { contains: search } },
      { field_target: { contains: search } },
    ];
  }

  // Apply isActive filter
  if (isActive !== undefined && isActive !== null) {
    where.is_active = isActive;
  }

  // Apply periodType filter (maps to any date-based logic - though this table doesn't have period-specific fields)
  // Note: periodType might be used for future extension or different validation rule types

  // Build order by
  let orderBy: any = { priority: "asc" };
  if (sortBy) {
    if (
      sortBy.fieldName === "created_at" ||
      sortBy.fieldName === "priority" ||
      sortBy.fieldName === "validation_type" ||
      sortBy.fieldName === "field_target"
    ) {
      orderBy = { [sortBy.fieldName]: sortBy.direction };
    }
  }
  if (sortOrder === "desc") {
    orderBy = { [Object.keys(orderBy)[0]]: "desc" };
  }

  // Execute parallel queries for total count and data
  const [rules, totalCount] = await Promise.all([
    MyGlobal.prisma.todo_app_validation_rules.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        rule_name: true,
        rule_key: true,
        validation_type: true,
        field_target: true,
        error_message_template: true,
        priority: true,
        is_active: true,
        created_at: true,
      },
    }),
    MyGlobal.prisma.todo_app_validation_rules.count({ where }),
  ]);

  // Map results to API format
  const data: ITodoAppValidationRule.ISummary[] = rules.map((rule) => ({
    id: rule.id as string & tags.Format<"uuid">,
    rule_name: rule.rule_name,
    rule_key: rule.rule_key,
    validation_type: rule.validation_type,
    field_target: rule.field_target ?? undefined,
    error_message_template: rule.error_message_template ?? undefined,
    priority: rule.priority ?? undefined,
    is_active: rule.is_active,
    created_at: toISOStringSafe(rule.created_at),
  }));

  // Calculate pagination metadata
  const totalPages = Math.ceil(totalCount / limit);

  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: totalCount,
      pages: totalPages,
    },
  };
}
