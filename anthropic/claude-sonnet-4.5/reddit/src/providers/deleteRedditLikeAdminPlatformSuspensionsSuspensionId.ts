import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteRedditLikeAdminPlatformSuspensionsSuspensionId(props: {
  admin: AdminPayload;
  suspensionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { suspensionId } = props;

  // Verify suspension exists and is currently active
  const suspension =
    await MyGlobal.prisma.reddit_like_platform_suspensions.findUniqueOrThrow({
      where: { id: suspensionId },
    });

  // Validate suspension is currently active before lifting
  if (!suspension.is_active) {
    throw new HttpException("Suspension is not currently active", 400);
  }

  // Prepare timestamp for soft delete
  const now = toISOStringSafe(new Date());

  // Lift suspension via soft delete
  await MyGlobal.prisma.reddit_like_platform_suspensions.update({
    where: { id: suspensionId },
    data: {
      deleted_at: now,
      is_active: false,
      updated_at: now,
    },
  });
}
