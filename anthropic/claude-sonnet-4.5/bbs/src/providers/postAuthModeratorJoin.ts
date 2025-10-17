import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthModeratorJoin(props: {
  body: IDiscussionBoardModerator.ICreate;
}): Promise<IDiscussionBoardModerator.IAuthorized> {
  const { body } = props;

  // Verify appointing administrator exists
  const admin =
    await MyGlobal.prisma.discussion_board_administrators.findUnique({
      where: { id: body.appointed_by_admin_id },
    });

  if (!admin) {
    throw new HttpException("Appointing administrator not found", 404);
  }

  // Check for duplicate username
  const existingUsername =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { username: body.username },
    });

  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Check for duplicate email
  const existingEmail =
    await MyGlobal.prisma.discussion_board_moderators.findFirst({
      where: { email: body.email },
    });

  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Hash password
  const passwordHash = await PasswordUtil.hash(body.password);

  // Generate timestamps
  const now = toISOStringSafe(new Date());

  // Create moderator account
  const moderator = await MyGlobal.prisma.discussion_board_moderators.create({
    data: {
      id: v4(),
      appointed_by_admin_id: body.appointed_by_admin_id,
      username: body.username,
      email: body.email,
      password_hash: passwordHash,
      email_verified: false,
      account_status: "pending_verification",
      is_active: true,
      created_at: now,
      updated_at: now,
      appointed_at: now,
    },
  });

  // Calculate token expirations
  const accessExpiration = new Date();
  accessExpiration.setMinutes(accessExpiration.getMinutes() + 30);

  const refreshExpiration = new Date();
  refreshExpiration.setDate(refreshExpiration.getDate() + 7);

  // Generate JWT tokens with ModeratorPayload structure
  const accessToken = jwt.sign(
    {
      id: moderator.id,
      type: "moderator",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "30m",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    {
      id: moderator.id,
      type: "moderator",
      tokenType: "refresh",
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  return {
    id: moderator.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: toISOStringSafe(accessExpiration),
      refreshable_until: toISOStringSafe(refreshExpiration),
    },
  };
}
