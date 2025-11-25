import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuestUser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserGuestUsersGuestUserId(props: {
  adminUser: AdminuserPayload;
  guestUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardGuestUser.IUpdate;
}): Promise<IDiscussionBoardGuestUser> {
  const { guestUserId, body } = props;

  let existing: any;
  try {
    existing = await MyGlobal.prisma.discussion_board_guestusers.findUnique({
      where: {
        id: guestUserId,
      },
    });
  } catch (_error) {
    throw new HttpException("Failed to load guest user", 500);
  }

  if (!existing) {
    throw new HttpException("Guest user not found", 404);
  }

  let updated: any;
  try {
    updated = await MyGlobal.prisma.discussion_board_guestusers.update({
      where: {
        id: guestUserId,
      },
      data: {
        ...(body.anonymous_token !== undefined && {
          anonymous_token: body.anonymous_token,
        }),
        ...(body.deleted_at !== undefined && {
          deleted_at: body.deleted_at,
        }),
        updated_at: toISOStringSafe(new Date()),
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new HttpException("anonymous_token already in use", 409);
      }
    }
    throw new HttpException("Failed to update guest user", 500);
  }

  return {
    id: updated.id,
    anonymous_token: updated.anonymous_token,
    created_at: toISOStringSafe(updated.created_at),
    updated_at: toISOStringSafe(updated.updated_at),
    deleted_at:
      updated.deleted_at === null || updated.deleted_at === undefined
        ? updated.deleted_at
        : toISOStringSafe(updated.deleted_at),
  };
}
