import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getDiscussionBoardAdminDiscussionBoardMembersDiscussionBoardMemberId(props: {
  admin: AdminPayload;
  discussionBoardMemberId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember> {
  const memberRecord = await MyGlobal.prisma.discussion_board_members.findFirst(
    {
      where: {
        id: props.discussionBoardMemberId,
        deleted_at: null,
      },
    },
  );

  if (memberRecord === null) {
    throw new HttpException("Discussion board member not found", 404);
  }

  return {
    id: memberRecord.id,
    email: memberRecord.email,
    password: "",
    created_at: toISOStringSafe(memberRecord.created_at),
    updated_at: toISOStringSafe(memberRecord.updated_at),
    deleted_at: memberRecord.deleted_at
      ? toISOStringSafe(memberRecord.deleted_at)
      : null,
  };
}
