import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteDiscussionBoardSuperAdminUserBansBanId(props: {
  superAdmin: SuperadminPayload;
  banId: string & tags.Format<"uuid">;
}): Promise<void> {
  const ban = await MyGlobal.prisma.discussion_board_user_bans.findUnique({
    where: { id: props.banId },
    select: { id: true, status: true, unbanned_at: true },
  });
  if (!ban) {
    throw new HttpException("Ban not found", 404);
  }
  if (ban.status === "removed" || ban.unbanned_at !== null) {
    throw new HttpException("Ban already removed", 400);
  }
  if (ban.status !== "active") {
    throw new HttpException("Ban is not active", 400);
  }
  await MyGlobal.prisma.discussion_board_user_bans.update({
    where: { id: props.banId },
    data: {
      status: "removed",
      unbanned_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  });
}
