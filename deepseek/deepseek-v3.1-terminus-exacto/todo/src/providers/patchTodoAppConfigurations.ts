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

export async function patchTodoAppConfigurations(props: {
  user: UserPayload;
  body: ITodoAppConfiguration.IRequest;
}): Promise<IPageITodoAppConfiguration.ISummary> {
  const { page, limit, search, category, data_type, sort, order } = props.body;

  // Calculate pagination parameters
  const skip = (page - 1) * limit;
  const take = limit;

  // Build WHERE conditions incrementally
  const whereConditions: Prisma.todo_app_configurationsWhereInput[] = [];

  // Text search condition
  if (search) {
    whereConditions.push({
      OR: [
        { key: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
      ],
    });
  }

  // Category filter
  if (category) {
    whereConditions.push({
      category: { equals: category, mode: "insensitive" },
    });
  }

  // Data type filter
  if (data_type) {
    whereConditions.push({
      data_type: { equals: data_type },
    });
  }

  // Combine conditions
  const where: Prisma.todo_app_configurationsWhereInput =
    whereConditions.length > 0 ? { AND: whereConditions } : {};

  // Build ORDER BY
  const orderBy: Prisma.todo_app_configurationsOrderByWithRelationInput = {};
  if (sort) {
    const direction = order === "desc" ? "desc" : "asc";
    orderBy[sort] = direction;
  } else {
    // Default sorting by created_at descending
    orderBy.created_at = "desc";
  }

  try {
    // Execute concurrent queries
    const [data, total] = await Promise.all([
      MyGlobal.prisma.todo_app_configurations.findMany({
        where,
        skip,
        take,
        orderBy,
      }),
      MyGlobal.prisma.todo_app_configurations.count({ where }),
    ]);

    // Transform data to match ISummary interface
    const transformedData: ITodoAppConfiguration.ISummary[] = data.map(
      (config) => ({
        id: config.id as string & tags.Format<"uuid">,
        key: config.key,
        value: config.value,
        category: config.category,
        data_type: config.data_type as IConfigurationDataType,
      }),
    );

    // Calculate pagination metadata
    const pages = Math.ceil(total / limit);

    return {
      data: transformedData,
      pagination: {
        current: page,
        limit,
        records: total,
        pages,
      },
    };
  } catch (error) {
    throw new HttpException("Failed to retrieve configuration settings", 500);
  }
}
