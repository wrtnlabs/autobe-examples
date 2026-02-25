import { IDiscussionBoardSystemConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardSystemConfigurationTransformer } from "../transformers/DiscussionBoardSystemConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getDiscussionBoardAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // findUniqueOrThrow automatically throws HTTP 404 if record not found
  const configuration =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: {
          id: props.configurationId,
          deleted_at: null, // Exclude soft-deleted configurations
        },
        // Use the transformer's select() method directly as shown in the loaded transformer
        ...DiscussionBoardSystemConfigurationTransformer.select(),
      },
    );
  // Transform database record to API response using the transformer
  return await DiscussionBoardSystemConfigurationTransformer.transform(
    configuration,
  );
}
