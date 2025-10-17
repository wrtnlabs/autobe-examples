import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";

export async function postAuthAdminJoin(props: {
  email: string &
    tags.Format<"email"> &
    tags.MinLength<5> &
    tags.MaxLength<254>;
  username: string &
    tags.Pattern<"^[a-zA-Z0-9_]+$"> &
    tags.MinLength<3> &
    tags.MaxLength<20>;
  password: string &
    tags.Pattern<"^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).+$"> &
    tags.MinLength<8> &
    tags.MaxLength<128>;
  body: ICommunityPlatformAdmin.IJoin;
}): Promise<ICommunityPlatformAdmin.IAuthorized> {
  // Extract parameters from props
  const { email, username, password } = props;

  // Check for existing email
  const existingEmail =
    await MyGlobal.prisma.community_platform_member.findFirst({
      where: { email },
    });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }

  // Check for existing username
  const existingUsername =
    await MyGlobal.prisma.community_platform_member.findFirst({
      where: { username },
    });
  if (existingUsername) {
    throw new HttpException("Username already exists", 409);
  }

  // Hash the password
  const hashedPassword = await PasswordUtil.hash(password);

  // Generate UUID for new user
  const userId: string & tags.Format<"uuid"> = v4();

  // Get current time as ISO string
  const now: string & tags.Format<"date-time"> = toISOStringSafe(new Date());

  // Create new member record
  const newUser = await MyGlobal.prisma.community_platform_member.create({
    data: {
      id: userId,
      email,
      username,
      password_hash: hashedPassword,
      is_verified: false,
      created_at: now,
      updated_at: now,
      karma: 0,
    },
  });

  // Generate verification token string
  const verificationToken = v4();
  const verificationTokenHash = await PasswordUtil.hash(verificationToken);
  const verificationExpiresAt: string & tags.Format<"date-time"> =
    toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours from now

  // Generate UUID for email verification record
  const verificationId: string & tags.Format<"uuid"> = v4();

  // Create email verification record
  await MyGlobal.prisma.community_platform_email_verifications.create({
    data: {
      id: verificationId,
      member: { connect: { id: userId } },
      token: verificationToken,
      token_hash: verificationTokenHash,
      expires_at: verificationExpiresAt,
      sent_at: now,
      is_used: false,
    },
  });

  // Generate JWT token
  const token: IAuthorizationToken = {
    access: jwt.sign({ userId: newUser.id }, MyGlobal.env.JWT_SECRET_KEY, {
      expiresIn: "1h",
      issuer: "autobe",
    }),
    refresh: jwt.sign(
      { userId: newUser.id, tokenType: "refresh" },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000)), // 1 hour from now
    refreshable_until: toISOStringSafe(
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    ), // 7 days from now
  };

  // Return the authorized response
  return {
    id: newUser.id,
    token,
  };
}
