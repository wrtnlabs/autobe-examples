import { ICommunityPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformConfiguration";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { CommunityPlatformConfigurationTransformer } from "../transformers/CommunityPlatformConfigurationTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putCommunityPlatformAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: ICommunityPlatformConfiguration.IUpdate;
}): Promise<ICommunityPlatformConfiguration> {
  // Verify configuration exists
  const existing =
    await MyGlobal.prisma.community_platform_configurations.findUniqueOrThrow({
      where: { id: props.configurationId },
    });
  // Validate data type compatibility if config_value is being updated
  if (props.body.config_value !== undefined) {
    // Basic validation based on data_type
    if (
      existing.data_type === "boolean" &&
      !["true", "false"].includes(props.body.config_value.toLowerCase())
    ) {
      throw new HttpException(
        "Configuration value must be 'true' or 'false' for boolean type",
        400,
      );
    }
    if (
      existing.data_type === "integer" &&
      !/^\d+$/.test(props.body.config_value)
    ) {
      throw new HttpException(
        "Configuration value must be a valid integer",
        400,
      );
    }
    if (existing.data_type === "json") {
      try {
        JSON.parse(props.body.config_value);
      } catch {
        throw new HttpException("Configuration value must be valid JSON", 400);
      }
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.community_platform_configurationsUpdateInput = {};
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }
  if (props.body.is_active !== undefined) {
    updateData.is_active = props.body.is_active;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // Always update the timestamp using ISO string format
  updateData.updated_at = new Date().toISOString();
  // Perform the update
  await MyGlobal.prisma.community_platform_configurations.update({
    where: { id: props.configurationId },
    data: updateData,
  });
  // Retrieve the updated configuration with transformer
  const updated =
    await MyGlobal.prisma.community_platform_configurations.findUniqueOrThrow({
      where: { id: props.configurationId },
      ...CommunityPlatformConfigurationTransformer.select(),
    });
  return await CommunityPlatformConfigurationTransformer.transform(updated);
}
