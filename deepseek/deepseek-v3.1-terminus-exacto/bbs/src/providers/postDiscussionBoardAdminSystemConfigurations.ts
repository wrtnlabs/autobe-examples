import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { DiscussionBoardSystemConfigurationCollector } from "../collectors/DiscussionBoardSystemConfigurationCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardAdminSystemConfigurations(props: {
  admin: AdminPayload;
  body: IDiscussionBoardSystemConfiguration.ICreate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Check if config_key already exists
  const existing =
    await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
      where: { config_key: props.body.config_key, deleted_at: null },
    });
  if (existing) {
    throw new HttpException(
      `Configuration with key '${props.body.config_key}' already exists`,
      400,
    );
  }
  // Validate config_value according to data_type
  validateConfigValue(props.body.config_value, props.body.data_type);
  // Create the configuration using collector
  const data = await DiscussionBoardSystemConfigurationCollector.collect({
    body: props.body,
  });
  const created =
    await MyGlobal.prisma.discussion_board_system_configurations.create({
      data,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  return await DiscussionBoardSystemConfigurationTransformer.transform(created);
}
function validateConfigValue(
  value: string,
  dataType: "string" | "integer" | "boolean" | "number" | "json",
): void {
  try {
    switch (dataType) {
      case "string":
        // Any string is valid
        break;
      case "integer":
        const intValue = parseInt(value, 10);
        if (isNaN(intValue) || !Number.isInteger(intValue)) {
          throw new Error(`Invalid integer value: ${value}`);
        }
        break;
      case "boolean":
        const lowerValue = value.toLowerCase();
        if (
          lowerValue !== "true" &&
          lowerValue !== "false" &&
          lowerValue !== "1" &&
          lowerValue !== "0"
        ) {
          throw new Error(`Invalid boolean value: ${value}`);
        }
        break;
      case "number":
        const numValue = parseFloat(value);
        if (isNaN(numValue)) {
          throw new Error(`Invalid number value: ${value}`);
        }
        break;
      case "json":
        JSON.parse(value);
        break;
    }
  } catch (error) {
    // Type guard for error message access
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new HttpException(
      `Invalid configuration value for type '${dataType}': ${errorMessage}`,
      400,
    );
  }
}
