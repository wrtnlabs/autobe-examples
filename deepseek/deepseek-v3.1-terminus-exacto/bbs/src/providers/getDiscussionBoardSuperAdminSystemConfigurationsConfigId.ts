import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardSuperAdminSystemConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemConfiguration> {
  const config =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
        ...DiscussionBoardSystemConfigurationTransformer.select(),
      },
    );
  return await DiscussionBoardSystemConfigurationTransformer.transform(config);
}
