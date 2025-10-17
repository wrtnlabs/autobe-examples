import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteCommunityPlatformAdminKarmaPenaltiesKarmaPenaltyId(props: {
  admin: AdminPayload;
  karmaPenaltyId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Check that the karma penalty exists before deletion
  const exists =
    await MyGlobal.prisma.community_platform_karma_penalties.findUnique({
      where: { id: props.karmaPenaltyId },
    });

  if (!exists) {
    throw new HttpException("Karma penalty not found", 404);
  }

  await MyGlobal.prisma.community_platform_karma_penalties.delete({
    where: { id: props.karmaPenaltyId },
  });
}
