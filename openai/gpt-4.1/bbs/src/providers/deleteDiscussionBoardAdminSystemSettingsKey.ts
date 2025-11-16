import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminSystemSettingsKey(props: {
  admin: AdminPayload;
  key: string;
}): Promise<void> {
  // Check if settings entry exists for this key
  const existing =
    await MyGlobal.prisma.discussion_board_system_settings.findUnique({
      where: { key: props.key },
    });
  if (!existing) {
    throw new HttpException(
      "Configuration setting not found for the specified key.",
      404,
    );
  }
  await MyGlobal.prisma.discussion_board_system_settings.delete({
    where: { key: props.key },
  });
}
