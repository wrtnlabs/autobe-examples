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

export async function putDiscussionBoardSuperAdminSystemConfigurationsConfigurationId(props: {
  superAdmin: SuperAdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemConfiguration.IUpdate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Validate that the configuration exists
  await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
    {
      where: { id: props.configurationId },
    },
  );
  // Construct the update data with proper validation
  const updateData: Record<string, any> = {
    updated_at: new Date(),
  };
  // Only include fields that are provided in the update body
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }
  if (props.body.data_type !== undefined) {
    // Validate the data_type against allowed values
    if (
      !["string", "integer", "boolean", "number", "json"].includes(
        props.body.data_type,
      )
    ) {
      throw new HttpException("Invalid data type", 400);
    }
    updateData.data_type = props.body.data_type;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.category !== undefined) {
    updateData.category = props.body.category;
  }
  if (props.body.is_sensitive !== undefined) {
    updateData.is_sensitive = props.body.is_sensitive;
  }
  // Perform the update with proper transformer selection
  const updated =
    await MyGlobal.prisma.discussion_board_system_configurations.update({
      where: { id: props.configurationId },
      data: updateData,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  // Transform database result to API response
  return await DiscussionBoardSystemConfigurationTransformer.transform(updated);
}
