import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function putDiscussionBoardAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
  body: IDiscussionBoardMemberuser.IUpdate;
}): Promise<IDiscussionBoardMemberuser> {
  // 1. Load existing member user by primary key
  const existing =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: {
        id: props.memberUserId,
      },
    });

  if (existing === null) {
    throw new HttpException("Member user not found", 404);
  }

  // 2. Enforce simple business rule: do not reactivate permanently banned accounts
  if (
    existing.account_status === "banned" &&
    props.body.account_status !== undefined &&
    props.body.account_status === "active"
  ) {
    throw new HttpException(
      "Banned accounts cannot be reactivated via this endpoint",
      400,
    );
  }

  // 3. Perform update using only fields provided in the body
  const updated = await MyGlobal.prisma.discussion_board_memberusers.update({
    where: {
      id: props.memberUserId,
    },
    data: {
      ...(props.body.email !== undefined && { email: props.body.email }),
      ...(props.body.display_name !== undefined && {
        display_name: props.body.display_name,
      }),
      ...(props.body.bio !== undefined && { bio: props.body.bio }),
      ...(props.body.location !== undefined && {
        location: props.body.location,
      }),
      ...(props.body.email_verified !== undefined && {
        email_verified: props.body.email_verified,
      }),
      ...(props.body.account_status !== undefined && {
        account_status: props.body.account_status,
      }),
      ...(props.body.deleted_at !== undefined && {
        deleted_at: props.body.deleted_at,
      }),
      ...(props.body.closed_at !== undefined && {
        closed_at: props.body.closed_at,
      }),
      ...(props.body.closed_by_admin !== undefined && {
        closed_by_admin: props.body.closed_by_admin,
      }),
      // updated_at is assumed to be handled by the database layer or Prisma middleware
    },
  });

  // 4. Map Prisma entity to IDiscussionBoardMemberuser DTO
  const createdAt = toISOStringSafe(updated.created_at);
  const updatedAt = toISOStringSafe(updated.updated_at);

  const deletedAt =
    updated.deleted_at !== null ? toISOStringSafe(updated.deleted_at) : null;

  const lastLoginAt =
    updated.last_login_at !== null
      ? toISOStringSafe(updated.last_login_at)
      : null;

  const closedAt =
    updated.closed_at !== null ? toISOStringSafe(updated.closed_at) : null;

  return {
    id: updated.id,
    email: updated.email,
    display_name: updated.display_name,
    bio: updated.bio,
    location: updated.location,
    email_verified: updated.email_verified,
    account_status: updated.account_status,
    created_at: createdAt,
    updated_at: updatedAt,
    deleted_at: deletedAt,
    last_login_at: lastLoginAt,
    closed_at: closedAt,
    closed_by_admin: updated.closed_by_admin,
  };
}
