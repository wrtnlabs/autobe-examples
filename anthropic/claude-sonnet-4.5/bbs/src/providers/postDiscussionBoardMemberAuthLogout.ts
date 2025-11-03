import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuth";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postDiscussionBoardMemberAuthLogout(props: {
  member: MemberPayload;
}): Promise<IDiscussionBoardAuth.ILogoutResult> {
  const { member } = props;

  const now = toISOStringSafe(new Date());

  await MyGlobal.prisma.discussion_board_member_sessions.update({
    where: {
      id: member.session_id,
    },
    data: {
      expired_at: now,
    },
  });

  return {
    success: true,
    message: "Logout successful",
  };
}
