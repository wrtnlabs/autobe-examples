import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserMemberUsersMemberUserId(props: {
  adminUser: AdminuserPayload;
  memberUserId: string;
}): Promise<void> {
  // Verify that the target member user exists before attempting deletion.
  const existingMemberUser =
    await MyGlobal.prisma.discussion_board_memberusers.findUnique({
      where: {
        id: props.memberUserId,
      },
    });

  if (existingMemberUser === null) {
    throw new HttpException("Discussion board member user not found", 404);
  }

  // Perform a hard delete of the member user record.
  // Related entities (sessions, restrictions, notification preferences, etc.)
  // are handled by database-level cascading rules or other domain services.
  await MyGlobal.prisma.discussion_board_memberusers.delete({
    where: {
      id: props.memberUserId,
    },
  });

  // Successful completion with no response body indicates the account was erased.
}
