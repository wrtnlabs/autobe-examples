import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthMemberJoin(props: {
  body: IDiscussionBoardMember.ICreate;
}): Promise<IDiscussionBoardMember.IAuthorized> {
  const { body } = props;

  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { username: body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.discussion_board_members.findUnique({
      where: { email: body.email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(body.password);

  // Generate member ID
  const memberId = v4() as string & tags.Format<"uuid">;

  // Current timestamp
  const now = toISOStringSafe(new Date());

  // Create member record
  const newMember = await MyGlobal.prisma.discussion_board_members.create({
    data: {
      id: memberId,
      username: body.username,
      email: body.email,
      password_hash: hashedPassword,
      display_name: body.display_name ?? null,
      email_verified: false,
      account_status: "pending_verification",
      profile_visibility: "public",
      activity_visibility: "public",
      created_at: now,
      updated_at: now,
    },
  });

  // Calculate token expiry timestamps using milliseconds
  const currentTime = Date.now();
  const accessTokenExpiryMs = currentTime + 30 * 60 * 1000;
  const refreshTokenExpiryMs = currentTime + 7 * 24 * 60 * 60 * 1000;

  // Generate JWT access token (30 minutes)
  const accessToken = jwt.sign(
    {
      id: newMember.id,
      type: "member",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  // Generate JWT refresh token (7 days)
  const refreshToken = jwt.sign(
    {
      id: newMember.id,
      type: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: newMember.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(new Date(accessTokenExpiryMs)),
      refreshable_until: toISOStringSafe(new Date(refreshTokenExpiryMs)),
    },
  };
}
