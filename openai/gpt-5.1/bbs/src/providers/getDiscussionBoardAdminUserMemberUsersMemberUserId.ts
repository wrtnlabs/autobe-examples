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

export async function getDiscussionBoardAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMemberuser> {
  const member = await MyGlobal.prisma.discussion_board_memberusers.findUnique({
    where: {
      id: props.memberUserId,
    },
  });

  if (member === null) {
    throw new HttpException("Member user not found", 404);
  }

  return {
    id: member.id,
    email: member.email,
    display_name: member.display_name,
    bio: member.bio ?? null,
    location: member.location ?? null,
    email_verified: member.email_verified,
    account_status: member.account_status,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : null,
    closed_at: member.closed_at ? toISOStringSafe(member.closed_at) : null,
    closed_by_admin: member.closed_by_admin,
  };
}
