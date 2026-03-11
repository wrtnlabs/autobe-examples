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

export async function putDiscussionBoardAdminSystemConfigurationsConfigId(props: {
  admin: AdminPayload;
  configId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemConfiguration.IUpdate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // First verify the configuration exists
  const existing =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
      },
    );
  // Update only the allowed fields: value and description
  const updated =
    await MyGlobal.prisma.discussion_board_system_configurations.update({
      where: { id: props.configId },
      data: {
        ...(props.body.value !== undefined && { value: props.body.value }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        updated_at: new Date(),
      },
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  return await DiscussionBoardSystemConfigurationTransformer.transform(updated);
}
