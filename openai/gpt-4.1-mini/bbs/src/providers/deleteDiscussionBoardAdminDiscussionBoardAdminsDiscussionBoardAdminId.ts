import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function deleteDiscussionBoardAdminDiscussionBoardAdminsDiscussionBoardAdminId(props: {
  admin: AdminPayload;
  discussionBoardAdminId: string;
}): Promise<void> {
  const existingAdmin = await MyGlobal.prisma.discussion_board_admin.findUnique(
    {
      where: {
        id: props.discussionBoardAdminId,
      },
    },
  );

  if (!existingAdmin) {
    throw new HttpException("Discussion Board Admin not found", 404);
  }

  await MyGlobal.prisma.discussion_board_admin.delete({
    where: {
      id: props.discussionBoardAdminId,
    },
  });
}
