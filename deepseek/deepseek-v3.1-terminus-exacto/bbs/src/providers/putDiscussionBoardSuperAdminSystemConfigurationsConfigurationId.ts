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

export async function putDiscussionBoardSuperAdminSystemConfigurationsConfigurationId(props: {
  superAdmin: SuperadminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemConfiguration.IUpdate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // Check if configuration exists
  const existingConfig =
    await MyGlobal.prisma.discussion_board_system_configurations.findUnique({
      where: {
        id: props.configurationId,
        deleted_at: null,
      },
    });
  if (!existingConfig) {
    throw new HttpException("Configuration not found", 404);
  }
  // Validate config_value based on data_type
  if (props.body.config_value !== undefined) {
    switch (existingConfig.data_type) {
      case "boolean":
        if (
          props.body.config_value !== "true" &&
          props.body.config_value !== "false"
        ) {
          throw new HttpException(
            "Configuration value must be 'true' or 'false' for boolean type",
            400,
          );
        }
        break;
      case "integer":
        if (
          isNaN(Number(props.body.config_value)) ||
          !Number.isInteger(Number(props.body.config_value))
        ) {
          throw new HttpException(
            "Configuration value must be a valid integer",
            400,
          );
        }
        break;
      case "json":
        try {
          JSON.parse(props.body.config_value);
        } catch {
          throw new HttpException(
            "Configuration value must be valid JSON",
            400,
          );
        }
        break;
    }
  }
  // Prepare update data with only defined values
  const updateData: Prisma.discussion_board_system_configurationsUpdateInput =
    {};
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
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
  // Prisma expects Date object for DateTime fields
  updateData.updated_at = new Date();
  // Update configuration
  const updated =
    await MyGlobal.prisma.discussion_board_system_configurations.update({
      where: { id: props.configurationId },
      data: updateData,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  return DiscussionBoardSystemConfigurationTransformer.transform(updated);
}
