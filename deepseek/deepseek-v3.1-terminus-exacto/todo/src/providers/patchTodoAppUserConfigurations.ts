import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IEConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEConfigurationDataType";
import { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build complex where condition
  const whereCondition: Record<string, unknown> = {
    deleted_at: null,
  };

  // Add search filter
  if (props.body.search) {
    whereCondition.OR = [
      { config_key: { contains: props.body.search, mode: "insensitive" } },
      { name: { contains: props.body.search, mode: "insensitive" } },
    ];
  }

  // Add category filter
  if (props.body.category) {
    whereCondition.category = props.body.category;
  }

  // Add data_type filter
  if (props.body.data_type) {
    whereCondition.data_type = props.body.data_type;
  }

  // Add boolean filters
  if (props.body.is_sensitive !== undefined) {
    whereCondition.is_sensitive = props.body.is_sensitive;
  }

  if (props.body.is_required !== undefined) {
    whereCondition.is_required = props.body.is_required;
  }

  // Execute parallel queries for efficiency
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_configurations.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.todo_app_configurations.count({
      where: whereCondition,
    }),
  ]);

  // Map results to ISummary format
  const mappedData = data.map((config) => ({
    id: config.id as string & tags.Format<"uuid">,
    config_key: config.config_key,
    name: config.name,
    category: config.category,
    data_type: config.data_type,
    is_sensitive: config.is_sensitive,
    version: config.version,
    validation_rules: config.validation_rules ?? undefined,
  }));

  return {
    data: mappedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
