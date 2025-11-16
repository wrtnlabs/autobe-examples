import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { IConfigurationDataType } from "@ORGANIZATION/PROJECT-api/lib/structures/IConfigurationDataType";
import { ISortOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/ISortOrder";
import { IPageITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfiguration";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const { page, limit } = props.body;
  const skip = (page - 1) * limit;

  // Build where conditions
  const whereConditions: Record<string, unknown> = {};

  // Handle search term (partial matching on key, description, category)
  if (props.body.search && props.body.search.trim() !== "") {
    whereConditions.OR = [
      { key: { contains: props.body.search } },
      { description: { contains: props.body.search } },
      { category: { contains: props.body.search } },
    ];
  }

  // Handle category filter
  if (props.body.category) {
    whereConditions.category = props.body.category;
  }

  // Handle data type filter
  if (props.body.data_type) {
    whereConditions.data_type = props.body.data_type;
  }

  // Build orderBy
  const orderBy: Record<string, unknown> = {};
  const sortField = props.body.sort || "created_at";
  const sortOrder = props.body.order || "desc";
  orderBy[sortField] = sortOrder;

  // Execute concurrent queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_configurations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.todo_app_configurations.count({
      where: whereConditions,
    }),
  ]);

  // Convert to summary format
  const summaryData: ITodoAppConfiguration.ISummary[] = data.map((config) => ({
    id: config.id,
    key: config.key,
    value: config.value,
    category: config.category,
    data_type: config.data_type as IConfigurationDataType,
  }));

  return {
    data: summaryData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
