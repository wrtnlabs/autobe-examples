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

export async function putDiscussionBoardAdminUserAdminUsersAdminUserId(props: {
  adminUser: AdminuserPayload;
  adminUserId: string;
  body: IDiscussionBoardAdminuser.IUpdate;
}): Promise<IDiscussionBoardAdminuser> {
  const { adminUserId, body } = props;

  const existing = await MyGlobal.prisma.discussion_board_adminusers.findFirst({
    where: {
      id: adminUserId,
      deleted_at: null,
    },
  });

  if (existing === null) {
    throw new HttpException("Admin user not found", 404);
  }

  const updateData = {} as {
    email?: string;
    display_name?: string;
    bio?: string | null;
    email_verified?: boolean;
    account_status?: string;
  };

  if (body.email !== undefined) {
    updateData.email = body.email;
  }

  if (body.displayName !== undefined || body.display_name !== undefined) {
    updateData.display_name =
      body.displayName !== undefined ? body.displayName : body.display_name;
  }

  if (body.bio !== undefined) {
    updateData.bio = body.bio;
  }

  if (body.emailVerified !== undefined || body.email_verified !== undefined) {
    updateData.email_verified =
      body.emailVerified !== undefined
        ? body.emailVerified
        : body.email_verified;
  }

  if (body.accountStatus !== undefined || body.account_status !== undefined) {
    updateData.account_status =
      body.accountStatus !== undefined
        ? body.accountStatus
        : body.account_status;
  }

  let updated = existing;

  if (Object.keys(updateData).length > 0) {
    try {
      updated = await MyGlobal.prisma.discussion_board_adminusers.update({
        where: { id: adminUserId },
        data: updateData,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new HttpException("Email already in use", 409);
      }
      throw error;
    }
  }

  return {
    id: updated.id,
    displayName: updated.display_name,
    email: updated.email,
    bio: updated.bio ?? null,
    emailVerified: updated.email_verified,
    accountStatus: updated.account_status,
    createdAt: toISOStringSafe(updated.created_at),
    updatedAt: toISOStringSafe(updated.updated_at),
    deletedAt: updated.deleted_at ? toISOStringSafe(updated.deleted_at) : null,
    lastLoginAt: updated.last_login_at
      ? toISOStringSafe(updated.last_login_at)
      : null,
  };
}
