import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";

export async function deleteCommunityPlatformAdministratorAdministratorsAdministratorId(props: {
  administrator: AdministratorPayload;
  administratorId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the target administrator account, regardless of deletion state
  const admin =
    await MyGlobal.prisma.community_platform_administrators.findUnique({
      where: { id: props.administratorId },
    });

  // If not found, or already deleted, exit cleanly (idempotent)
  if (!admin || admin.deleted_at !== null) {
    return;
  }

  // Set the deleted_at field to the current timestamp (string, not Date)
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.community_platform_administrators.update({
    where: { id: props.administratorId },
    data: { deleted_at: now },
  });
}
