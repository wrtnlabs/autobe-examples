import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function postDiscussionBoardMembers(props: {
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.ISummary> {
  const { body } = props;

  // Validate username uniqueness
  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { username: body.username },
    });

  if (existingUsername) {
    throw new HttpException(
      "Username already exists. Please choose a different username.",
      409,
    );
  }

  // Validate email uniqueness
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findFirst({
      where: { email: body.email },
    });

  if (existingEmail) {
    throw new HttpException(
      "Email address already registered. Please use a different email or log in.",
      409,
    );
  }

  // Hash password securely
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate member ID and current timestamp
  const memberId = v4();
  const now = toISOStringSafe(new Date());

  // Create member record with pending email verification status
  const createdMember = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
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

  // Create initial session record for registration tracking
  const sessionId = v4();
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

  // Return member summary excluding sensitive authentication data
  return {
    id: createdMember.id,
    username: createdMember.username,
    display_name: createdMember.display_name ?? undefined,
    profile_picture_url: createdMember.profile_picture_url ?? undefined,
  };
}
