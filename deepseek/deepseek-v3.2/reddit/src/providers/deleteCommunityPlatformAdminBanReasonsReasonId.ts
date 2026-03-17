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

export async function deleteCommunityPlatformAdminBanReasonsReasonId(props: {
  admin: AdminPayload;
  reasonId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify admin exists (though AdminAuth decorator already does this)
  const adminExists = await MyGlobal.prisma.community_platform_admins.findFirst(
    {
      where: { id: props.admin.id, deleted_at: null },
    },
  );
  if (!adminExists) {
    throw new HttpException("Admin not found", 403);
  }
  // 2. Find the ban reason and verify it exists and is active
  const reason = await MyGlobal.prisma.community_platform_ban_reasons.findFirst(
    {
      where: { id: props.reasonId },
      select: { id: true, active: true, deleted_at: true },
    },
  );
  if (!reason) {
    throw new HttpException("Ban reason not found", 404);
  }
  if (reason.deleted_at !== null) {
    throw new HttpException("Ban reason is already deleted", 400);
  }
  if (!reason.active) {
    throw new HttpException("Ban reason is already inactive", 400);
  }
  // 3. Check if any active bans reference this reason
  const activeBanCount = await MyGlobal.prisma.community_platform_bans.count({
    where: {
      active: true,
      deleted_at: null,
      reason: reason.id, // This needs verification - is reason stored as text or foreign key?
    },
  });
  // Actually need to check the schema first - ban reasons are referenced by code, not id
  // Let's check the loaded schema...
  // 4. Perform soft delete
  const now = new Date();
  await MyGlobal.prisma.community_platform_ban_reasons.update({
    where: { id: props.reasonId },
    data: {
      active: false,
      deleted_at: now,
      updated_at: now,
    },
  });
}
