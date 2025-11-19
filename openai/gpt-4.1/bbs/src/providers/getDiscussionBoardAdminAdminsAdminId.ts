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

export async function getDiscussionBoardAdminAdminsAdminId(props: {
  admin: AdminPayload;
  adminId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardAdmin> {
  const adminRecord = await MyGlobal.prisma.discussion_board_admins.findUnique({
    where: { id: props.adminId },
  });
  if (!adminRecord) {
    throw new HttpException("Admin account not found.", 404);
  }
  return {
    id: adminRecord.id,
    email: adminRecord.email,
    created_at: toISOStringSafe(adminRecord.created_at),
    updated_at: toISOStringSafe(adminRecord.updated_at),
    deleted_at:
      adminRecord.deleted_at !== null && adminRecord.deleted_at !== undefined
        ? toISOStringSafe(adminRecord.deleted_at)
        : adminRecord.deleted_at === null
          ? null
          : undefined,
  };
}
