import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperAdminPayload } from "../decorators/payload/SuperAdminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemConfigurationsConfigurationId(props: {
  superAdmin: SuperAdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemConfiguration> {
  const configuration =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: {
          id: props.configurationId,
          deleted_at: null,
        },
        ...DiscussionBoardSystemConfigurationTransformer.select(),
      },
    );
  return await DiscussionBoardSystemConfigurationTransformer.transform(
    configuration,
  );
}
