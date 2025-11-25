import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditCommunityAdminRedditCommunitySystemConfigurationsName(props: {
  admin: AdminPayload;
  name: string;
}): Promise<void> {
  const existing =
    await MyGlobal.prisma.reddit_community_system_configurations.findUnique({
      where: { name: props.name },
    });
  if (!existing) {
    throw new HttpException(
      "Reddit community system configuration not found",
      404,
    );
  }

  await MyGlobal.prisma.reddit_community_system_configurations.delete({
    where: { name: props.name },
  });
}
