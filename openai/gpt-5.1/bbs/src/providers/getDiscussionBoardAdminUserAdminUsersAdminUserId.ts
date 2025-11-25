import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function getDiscussionBoardAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string;
}): Promise<IDiscussionBoardAdminuser> {
  const adminRecord =
    await MyGlobal.prisma.discussion_board_adminusers.findUnique({
      where: {
        id: props.adminUserId,
      },
    });

  if (adminRecord === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const result: IDiscussionBoardAdminuser = {
    id: adminRecord.id,
    displayName: adminRecord.display_name,
    email: adminRecord.email,
    bio: adminRecord.bio,
    emailVerified: adminRecord.email_verified,
    accountStatus: adminRecord.account_status,
    createdAt: toISOStringSafe(adminRecord.created_at),
    updatedAt: toISOStringSafe(adminRecord.updated_at),
    deletedAt:
      adminRecord.deleted_at === null
        ? null
        : toISOStringSafe(adminRecord.deleted_at),
    lastLoginAt:
      adminRecord.last_login_at === null
        ? null
        : adminRecord.last_login_at === undefined
          ? undefined
          : toISOStringSafe(adminRecord.last_login_at),
  };

  return result;
}
