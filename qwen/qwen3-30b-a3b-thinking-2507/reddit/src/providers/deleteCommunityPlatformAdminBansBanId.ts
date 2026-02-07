import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteCommunityPlatformAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban =
    await MyGlobal.prisma.community_platform_moderation_bans.findUnique({
      where: { id: props.banId },
    });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  await MyGlobal.prisma.community_platform_moderation_bans.delete({
    where: { id: props.banId },
  });
}
