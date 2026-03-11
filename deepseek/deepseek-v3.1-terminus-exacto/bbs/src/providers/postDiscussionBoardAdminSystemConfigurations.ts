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
  // Check key uniqueness
  const existing =
    await MyGlobal.prisma.discussion_board_system_configurations.findFirst({
      where: { key: props.body.key, deleted_at: null },
    });
  if (existing) {
    throw new HttpException(
      `Configuration key '${props.body.key}' already exists`,
      400,
    );
  }
  // Create configuration using collector
  const configuration =
    await MyGlobal.prisma.discussion_board_system_configurations.create({
      data: await DiscussionBoardSystemConfigurationCollector.collect({
        body: props.body,
      }),
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardSystemConfigurationTransformer.transform(
    configuration,
  );
}
