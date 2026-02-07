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

export async function deleteCommunityAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string;
}): Promise<void> {
  const ban = await MyGlobal.prisma.community_bans.findUnique({
    where: { id: props.banId },
    select: { banned_by_id: true, deleted_at: true },
  });
  if (!ban) throw new HttpException("Ban not found", 404);
  if (ban.deleted_at !== null)
    throw new HttpException("Ban already lifted", 404);
  // Verify permissions: admin must be the banning admin or a system admin
  if (ban.banned_by_id !== props.admin.id && props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  // Update ban to lift it using ISO timestamp from toISOStringSafe which returns string & tags.Format<'date-time'>
  await MyGlobal.prisma.community_bans.update({
    where: { id: props.banId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
