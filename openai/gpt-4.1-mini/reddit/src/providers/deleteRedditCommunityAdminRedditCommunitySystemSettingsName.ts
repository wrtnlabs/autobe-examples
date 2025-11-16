import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunitySystemSettingsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_system_settings.findUnique({
      where: { name: props.name },
    });

  if (existing === null) {
    throw new HttpException("System setting not found", 404);
  }

  await MyGlobal.prisma.reddit_community_system_settings.delete({
    where: { name: props.name },
  });
}
