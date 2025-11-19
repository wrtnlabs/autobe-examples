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

export async function getDiscussionBoardRegisteredUserSystemConfigurationsConfigKey(props: {
  registeredUser: RegisteredUserPayload;
  configKey: string;
}): Promise<IDiscussionBoardConfiguration> {
  const config =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: { key: props.configKey },
    });

  if (!config) {
    throw new HttpException(
      `Configuration with key '${props.configKey}' not found`,
      404,
    );
  }

  return {
    key: config.key,
    value: config.value,
  };
}
