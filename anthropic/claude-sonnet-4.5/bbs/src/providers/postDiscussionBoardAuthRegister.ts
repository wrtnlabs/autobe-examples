import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postDiscussionBoardAuthRegister(props: {
  body: IDiscussionBoardMember.IRegister;
}): Promise<IDiscussionBoardMember> {
  const { body } = props;

  // Hash password securely
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate UUIDs and timestamp once
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const now = toISOStringSafe(new Date());

  // Create member record with inline data
  const createdMember = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      display_name: body.display_name ?? null,
      bio: body.bio ?? null,
      location: body.location ?? null,
      website_url: body.website_url ?? null,
      profile_picture_url: body.profile_picture_url ?? null,
      email_verified: false,
      status: "pending_email_verification",
      profile_visibility: "public",
      activity_visibility: "public",
      last_login_at: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  // Create session record after successful member creation
  await MyGlobal.prisma.discussion_board_member_sessions.create({
    data: {
      id: sessionId,
      discussion_board_member_id: memberId,
      ip: body.ip ?? "",
      href: body.href,
      referrer: body.referrer,
      created_at: now,
      expired_at: null,
    },
  });

  // Return member data matching IDiscussionBoardMember interface
  return {
    id: memberId,
    username: createdMember.username,
    email: body.email,
    password_hash: hashedPassword,
    display_name: body.display_name ?? undefined,
    bio: body.bio ?? undefined,
    location: body.location ?? undefined,
    website_url: body.website_url ?? undefined,
    profile_picture_url: body.profile_picture_url ?? undefined,
    email_verified: false,
    status: "pending_email_verification",
    profile_visibility: "public",
    activity_visibility: "public",
    last_login_at: undefined,
    created_at: now,
    updated_at: now,
    deleted_at: undefined,
  };
}
