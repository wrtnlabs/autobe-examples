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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postDiscussionBoardSuperAdminSystemConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IDiscussionBoardSystemConfiguration.ICreate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Check if config_key already exists
  const existingConfig =
    await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
      where: {
        config_key: props.body.config_key,
        deleted_at: null,
      },
    });
  if (existingConfig) {
    throw new HttpException("Configuration key already exists", 400);
  }
  // Create new configuration using collector
  const created =
    await MyGlobal.prisma.discussion_board_system_configurations.create({
      data: await DiscussionBoardSystemConfigurationCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  return await DiscussionBoardSystemConfigurationTransformer.transform(created);
}
