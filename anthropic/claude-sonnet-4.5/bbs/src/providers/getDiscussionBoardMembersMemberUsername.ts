import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function getDiscussionBoardMembersMemberUsername(props: {
  memberUsername: string;
}): Promise<IDiscussionBoardMember> {
  const { memberUsername } = props;

  const member = await MyGlobal.prisma.discussion_board_members.findFirst({
    where: {
      username: memberUsername,
      deleted_at: null,
    },
  });

  if (!member) {
    throw new HttpException("Member not found", 404);
  }

  return {
    id: member.id as string & tags.Format<"uuid">,
    username: member.username,
    email: member.email,
    password_hash: member.password_hash,
    display_name: member.display_name ?? null,
    bio: member.bio ?? null,
    location: member.location ?? null,
    website_url: member.website_url
      ? (member.website_url as string & tags.Format<"uri">)
      : null,
    profile_picture_url: member.profile_picture_url
      ? (member.profile_picture_url as string & tags.Format<"uri">)
      : null,
    email_verified: member.email_verified,
    status: member.status,
    profile_visibility: member.profile_visibility,
    activity_visibility: member.activity_visibility,
    last_login_at: member.last_login_at
      ? toISOStringSafe(member.last_login_at)
      : null,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
  };
}
