import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberId(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
}): Promise<void> {
  const { admin, discussionBoardMemberId } = props;

  // Authorization assumed valid as admin passed

  // Verify member exists or throw 404 if not
  await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
    where: { id: discussionBoardMemberId },
  });

  // Perform hard delete
  await MyGlobal.prisma.discussion_board_members.delete({
    where: { id: discussionBoardMemberId },
  });
}
