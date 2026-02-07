import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IDiscussionBoardSystemConfigurationValidationItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfigurationValidationItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemConfiguration";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfiguration.IRequest;
}): Promise<IPageIDiscussionBoardSystemConfiguration.ISummary> {
  // Use default pagination parameters since IRequest doesn't include page/limit
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  // Build search conditions - filter out deleted configurations
  const whereConditions: any = {
    deleted_at: null,
  };
  // If validation configurations are provided, this is a validation request
  if (props.body.configurations && props.body.configurations.length > 0) {
    // Validate each configuration parameter
    for (const config of props.body.configurations) {
      // Check if configuration exists
      const existingConfig =
        await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
          where: {
            config_key: config.config_key,
            data_type: config.data_type,
            deleted_at: null,
          },
        });
      if (!existingConfig) {
        throw new HttpException(
          `Configuration ${config.config_key} with data type ${config.data_type} not found`,
          404,
        );
      }
      // Validate config_value format based on data_type
      switch (config.data_type) {
        case "integer":
          if (isNaN(parseInt(config.config_value))) {
            throw new HttpException(
              `Invalid integer value for configuration ${config.config_key}: ${config.config_value}`,
              400,
            );
          }
          break;
        case "boolean":
          if (
            !["true", "false", "1", "0"].includes(
              config.config_value.toLowerCase(),
            )
          ) {
            throw new HttpException(
              `Invalid boolean value for configuration ${config.config_key}: ${config.config_value}`,
              400,
            );
          }
          break;
        case "json":
          try {
            JSON.parse(config.config_value);
          } catch {
            throw new HttpException(
              `Invalid JSON value for configuration ${config.config_key}`,
              400,
            );
          }
          break;
        // string type accepts any value
      }
    }
    // For validation requests, return current configurations matching the keys
    const configKeys = props.body.configurations.map((c) => c.config_key);
    whereConditions.config_key = { in: configKeys };
  }
  // Execute search query with filtering
  const data =
    await MyGlobal.prisma.discussion_board_system_configurations.findMany({
      where: whereConditions,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        config_key: true,
        data_type: true,
        category: true,
        description: true,
      },
    });
  const total =
    await MyGlobal.prisma.discussion_board_system_configurations.count({
      where: whereConditions,
    });
  // Transform database results to match ISummary format with proper typing
  const transformedData = data.map((config) => ({
    id: config.id as string & tags.Format<"uuid">,
    config_key: config.config_key,
    data_type: config.data_type,
    category: config.category,
    description: config.description,
  }));
  return {
    data: transformedData,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
