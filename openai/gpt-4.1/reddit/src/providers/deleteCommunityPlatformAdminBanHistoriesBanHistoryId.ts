import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminBanHistoriesBanHistoryId(props: {
  admin: AdminPayload;
  banHistoryId: string & tags.Format<"uuid">;
}): Promise<void> {
  try {
    await MyGlobal.prisma.community_platform_ban_histories.delete({
      where: { id: props.banHistoryId },
    });
  } catch (err) {
    throw new HttpException("BanHistory not found", 404);
  }
}
