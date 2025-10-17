import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminKarmaAwardsKarmaAwardId(props: {
  admin: AdminPayload;
  karmaAwardId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Check if award exists
  const existing =
    await MyGlobal.prisma.community_platform_karma_awards.findUnique({
      where: { id: props.karmaAwardId },
      select: { id: true },
    });
  if (!existing) {
    throw new HttpException("Karma award not found", 404);
  }
  // Step 2: Perform hard delete
  await MyGlobal.prisma.community_platform_karma_awards.delete({
    where: { id: props.karmaAwardId },
  });
}
