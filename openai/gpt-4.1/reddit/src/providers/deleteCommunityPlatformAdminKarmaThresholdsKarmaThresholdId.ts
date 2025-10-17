import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminKarmaThresholdsKarmaThresholdId(props: {
  admin: AdminPayload;
  karmaThresholdId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Verify that the karma threshold exists (throw 404 if not)
  const threshold =
    await MyGlobal.prisma.community_platform_karma_thresholds.findUnique({
      where: { id: props.karmaThresholdId },
    });
  if (!threshold) {
    throw new HttpException("Karma threshold not found", 404);
  }

  // Perform hard delete (schema has deleted_at, but spec requires hard deletion)
  await MyGlobal.prisma.community_platform_karma_thresholds.delete({
    where: { id: props.karmaThresholdId },
  });
}
