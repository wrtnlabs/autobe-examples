import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminuserPayload } from "../decorators/payload/AdminuserPayload";

export async function deleteDiscussionBoardAdminUserMemberUsersMemberUserIdRestriction(props: {
  adminUser: AdminuserPayload;
  memberUserId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find existing restriction for the given member user
  const existingRestriction =
    await MyGlobal.prisma.discussion_board_memberuser_restrictions.findFirst({
      where: {
        discussion_board_memberuser_id: props.memberUserId,
      },
    });

  // If no restriction exists, respond with not-found error
  if (existingRestriction === null) {
    throw new HttpException(
      "No active restriction exists for the specified member user.",
      404,
    );
  }

  // Hard delete the restriction row by its primary key
  await MyGlobal.prisma.discussion_board_memberuser_restrictions.delete({
    where: {
      id: existingRestriction.id,
    },
  });

  // Nothing to return for void response
  return;
}
