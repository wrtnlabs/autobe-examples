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

export async function putDiscussionBoardSuperAdminSystemConfigurationsConfigId(props: {
  superAdmin: SuperadminPayload;
  configId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemConfiguration.IUpdate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Verify configuration exists
  const existing =
    await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
      {
        where: { id: props.configId },
      },
    );
  // Prepare update data - only update value and description, preserve key/data_type
  const updateData: Prisma.discussion_board_system_configurationsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.value !== undefined) {
    updateData.value = props.body.value;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // If no fields to update, just return existing configuration
  if (Object.keys(updateData).length === 1) {
    // only updated_at
    return await DiscussionBoardSystemConfigurationTransformer.transform(
      existing,
    );
  }
  // Perform update
  const updated =
    await MyGlobal.prisma.discussion_board_system_configurations.update({
      where: { id: props.configId },
      data: updateData,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  // Transform and return
  return await DiscussionBoardSystemConfigurationTransformer.transform(updated);
}
