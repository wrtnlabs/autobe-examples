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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function putDiscussionBoardAdminSystemConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IDiscussionBoardSystemConfiguration.IUpdate;
}): Promise<IDiscussionBoardSystemConfiguration> {
  // First verify the configuration exists
  await MyGlobal.prisma.discussion_board_system_configurations.findUniqueOrThrow(
    {
      where: { id: props.configurationId },
    },
  );
  // Build update data only with provided fields
  const updateData: any = { updated_at: new Date().toISOString() };
  if (props.body.config_value !== undefined) {
    updateData.config_value = props.body.config_value;
  }
  if (props.body.data_type !== undefined) {
    // Validate data_type matches allowed values
    const allowedDataTypes = [
      "string",
      "integer",
      "boolean",
      "number",
      "json",
    ] as const;
    if (!allowedDataTypes.includes(props.body.data_type as any)) {
      throw new HttpException(
        "Invalid data_type value. Must be one of: string, integer, boolean, number, json",
        400,
      );
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
  // Perform the update operation
  const updated =
    await MyGlobal.prisma.discussion_board_system_configurations.update({
      where: { id: props.configurationId },
      data: updateData,
      ...DiscussionBoardSystemConfigurationTransformer.select(),
    });
  // Transform database result to API response format
  return await DiscussionBoardSystemConfigurationTransformer.transform(updated);
}
