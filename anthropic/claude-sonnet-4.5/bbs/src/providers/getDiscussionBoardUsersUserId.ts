import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardUsersUserId(props: {
  userId: string & tags.Format<"uuid">;
}): Promise<IDiscussionBoardMember.IPublic> {
  const { userId } = props;

  const member =
    await MyGlobal.prisma.discussion_board_members.findUniqueOrThrow({
      where: {
        id: userId,
        deleted_at: null,
      },
    });

  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    display_name:
      member.display_name === null ? undefined : member.display_name,
    bio: member.bio === null ? undefined : member.bio,
    avatar_url: member.avatar_url === null ? undefined : member.avatar_url,
    location: member.location === null ? undefined : member.location,
    website: member.website === null ? undefined : member.website,
    email_verified: member.email_verified,
    account_status: member.account_status,
    created_at: toISOStringSafe(member.created_at),
    last_activity_at: member.last_activity_at
      ? toISOStringSafe(member.last_activity_at)
      : undefined,
  };
}
