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

export async function deleteDiscussionBoardAdminBansBanId(props: {
  admin: AdminPayload;
  banId: string;
}): Promise<void> {
  const user = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      id: props.banId,
    },
  });
  if (user === null) {
    throw new HttpException("Ban not found", 404);
  }
  await MyGlobal.prisma.discussion_board_members.update({
    where: { id: props.banId },
    data: {
      is_active: true,
      updated_at: toISOStringSafe(new Date()),
    },
  });
}
