import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfigurationValue";
import { IPageITodoAppConfigurationValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppConfigurationValue";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { ITodoAppConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppConfiguration";
import { UserPayload } from "../decorators/payload/UserPayload";

export async function patchTodoAppUserConfigurationsConfigKeyValues(props: {
  user: UserPayload;
  configKey: string;
  body: ITodoAppConfigurationValue.IRequest;
}): Promise<IPageITodoAppConfigurationValue.ISummary> {
  // Verify the configuration exists
  const configuration = await MyGlobal.prisma.todo_app_configurations.findFirst(
    {
      where: {
        config_key: props.configKey,
        deleted_at: null,
      },
    },
  );

  if (!configuration) {
    throw new HttpException("Configuration not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  // Build complex where conditions
  const whereCondition: Record<string, unknown> = {
    todo_app_configuration_id: configuration.id,
    deleted_at: null,
  };

  // Environment filter
  if (props.body.environment) {
    whereCondition.environment = props.body.environment;
  }

  // Value type filter
  if (props.body.value_type) {
    whereCondition.value_type = props.body.value_type;
  }

  // Active status filter
  if (props.body.is_active !== undefined && props.body.is_active !== null) {
    whereCondition.is_active = props.body.is_active;
  }

  // Search term across multiple fields
  if (props.body.search) {
    whereCondition.OR = [
      { environment: { contains: props.body.search } },
      { config_value: { contains: props.body.search } },
    ];
  }

  // Date range filters - use direct string comparison since Prisma handles ISO strings
  if (props.body.effective_from) {
    whereCondition.effective_from = { gte: props.body.effective_from };
  }

  if (props.body.effective_to) {
    whereCondition.effective_to = { lte: props.body.effective_to };
  }

  if (props.body.created_at) {
    whereCondition.created_at = { gte: props.body.created_at };
  }

  if (props.body.updated_at) {
    whereCondition.updated_at = { gte: props.body.updated_at };
  }

  // Additional config_key filter (if provided)
  let finalWhereCondition = whereCondition;
  if (props.body.config_key && props.body.config_key !== props.configKey) {
    const additionalConfig =
      await MyGlobal.prisma.todo_app_configurations.findFirst({
        where: {
          config_key: props.body.config_key,
          deleted_at: null,
        },
      });

    if (additionalConfig) {
      finalWhereCondition = {
        ...whereCondition,
        todo_app_configuration_id: additionalConfig.id,
      };
    }
  }

  // Build orderBy
  const orderBy: Record<string, string> = {};
  if (props.body.order_by) {
    orderBy[props.body.order_by] = props.body.order ?? "desc";
  } else {
    orderBy.created_at = "desc";
  }

  // Execute concurrent queries
  const [data, total] = await Promise.all([
    MyGlobal.prisma.todo_app_configuration_values.findMany({
      where: finalWhereCondition,
      skip,
      take: limit,
      orderBy,
      include: {
        configuration: true,
      },
    }),
    MyGlobal.prisma.todo_app_configuration_values.count({
      where: finalWhereCondition,
    }),
  ]);

  // Transform data to match API interface
  const transformedData = data.map((item) => ({
    id: item.id,
    todo_app_configuration_id: item.todo_app_configuration_id,
    configuration: {
      id: item.configuration.id,
      config_key: item.configuration.config_key,
      name: item.configuration.name,
      category: item.configuration.category,
      data_type: item.configuration.data_type,
      is_sensitive: item.configuration.is_sensitive,
      version: item.configuration.version,
      validation_rules: item.configuration.validation_rules ?? undefined,
    },
    environment: item.environment,
    config_value: item.config_value,
    value_type: item.value_type,
    is_active: item.is_active,
    effective_from: toISOStringSafe(item.effective_from),
    effective_to: item.effective_to
      ? toISOStringSafe(item.effective_to)
      : undefined,
    created_at: toISOStringSafe(item.created_at),
    updated_at: toISOStringSafe(item.updated_at),
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
