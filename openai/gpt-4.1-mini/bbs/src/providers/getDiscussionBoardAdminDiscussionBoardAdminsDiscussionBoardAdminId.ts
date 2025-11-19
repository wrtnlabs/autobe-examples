import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  const adminRecord = await MyGlobal.prisma.discussion_board_admin.findUnique({
    where: { id: props.discussionBoardAdminId },
  });

  if (!adminRecord) {
    throw new HttpException("Discussion board admin not found", 404);
  }

  return {
    id: adminRecord.id,
    email: adminRecord.email,
    nickname: adminRecord.nickname,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at: adminRecord.deleted_at
      ? toISOStringSafe(adminRecord.deleted_at)
      : null,
  };
}
