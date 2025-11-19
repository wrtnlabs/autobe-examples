import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { RegisteredUserPayload } from "../decorators/payload/RegisteredUserPayload";

export async function deleteDiscussionBoardRegisteredUserSystemConfigurationsConfigKey(props: {
  registeredUser: RegisteredUserPayload;
  configKey: string;
}): Promise<void> {
  const existingConfig =
    await MyGlobal.prisma.discussion_board_configurations.findUnique({
      where: { key: props.configKey },
    });

  if (!existingConfig) {
    throw new HttpException("Configuration key not found", 404);
  }

  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.discussion_board_configurations.delete({
      where: { key: props.configKey },
    }),
  ]);
}
