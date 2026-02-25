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
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemConfigurations(props: {
  superAdmin: SuperAdminPayload;
  body: IDiscussionBoardSystemConfiguration.ICreate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Validate that config_key is unique
  const existing =
    await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
      where: {
        config_key: props.body.config_key,
        deleted_at: null,
      },
    });
  if (existing !== null) {
    throw new HttpException("Configuration key already exists", 400);
  }
  // Validate data_type is one of the allowed values
  const allowedDataTypes = ["string", "integer", "boolean", "number", "json"];
  if (!allowedDataTypes.includes(props.body.data_type)) {
    throw new HttpException("Invalid data type specified", 400);
  }
  // Use collector to prepare data
  const data = await DiscussionBoardSystemConfigurationCollector.collect({
    body: props.body,
  });
  // Create configuration record
  const created =
    await MyGlobal.prisma.discussion_board_system_configurations.create({
      data: data,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  // Transform to response format
  return await DiscussionBoardSystemConfigurationTransformer.transform(created);
}
