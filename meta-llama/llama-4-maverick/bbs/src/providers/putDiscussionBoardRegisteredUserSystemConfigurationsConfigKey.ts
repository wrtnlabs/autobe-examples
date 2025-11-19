import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardConfiguration";
import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function putDiscussionBoardRegisteredUserSystemConfigurationsConfigKey(props: {
  registeredUser: RegisteredUserPayload;
  configKey: string;
  body: IDiscussionBoardConfiguration.IUpdate;
}): Promise<IDiscussionBoardConfiguration> {
  const { configKey, body } = props;

  // Validate input parameters using Typia
  if (!typia.is<string>(configKey)) {
    throw new HttpException("Invalid configKey", 400);
  }

  if (!typia.is<IDiscussionBoardConfiguration.IUpdate>(body)) {
    throw new HttpException("Invalid configuration value", 400);
  }

  // Check if configuration key exists
  const existingConfig =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: { key: configKey },
    });

  if (!existingConfig) {
    throw new HttpException(`Configuration key '${configKey}' not found`, 404);
  }

  // Update configuration value
  const updatedConfig =
    await MyGlobal.prisma.discussion_board_configurations.update({
      where: { key: configKey },
      data: {
        value: body,
        updated_at: toISOStringSafe(new Date()),
      },
    });

  // Return updated configuration details
  return {
    key: updatedConfig.key,
    value: updatedConfig.value,
  };
}
