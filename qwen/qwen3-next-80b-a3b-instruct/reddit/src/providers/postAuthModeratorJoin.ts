import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";

export async function postAuthModeratorJoin(props: {
  moderator: ModeratorPayload;
  body: ICommunityPlatformModerator.ICreate;
}): Promise<ICommunityPlatformModerator.IAuthorized> {
  // Validate that the moderator role is not already authenticated (join operation should not have auth)
  if (props.moderator) {
    throw new HttpException(
      "Unauthorized: Join operation should not be authenticated",
      403,
    );
  }

  // Validate required fields exist in body
  const { email, username, password, bio } = props.body;

  // Check for existing user by email
  const existingEmail =
    await MyGlobal.prisma.community_platform_member.findFirst({
      where: { email },
    });
  if (existingEmail) {
    throw new HttpException("Email is already registered", 409);
  }

  // Check for existing user by username
  const existingUsername =
    await MyGlobal.prisma.community_platform_member.findFirst({
      where: { username },
    });
  if (existingUsername) {
    throw new HttpException("Username is already taken", 409);
  }

  // Hash password using PasswordUtil
  const hashedPassword = await PasswordUtil.hash(password);

  // Create member record - is_verified is false by default per schema
  const createdMemberId = v4() as string & tags.Format<"uuid">;
  const createdMember = await MyGlobal.prisma.community_platform_member.create({
    data: {
      id: createdMemberId,
      email: email,
      username: username,
      password_hash: hashedPassword,
      is_verified: false,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      karma: 0,
    },
  });

  // Create email verification record
  const verificationToken = v4();
  const verificationTokenHash = v4(); // Hash the token for storage
  const expiresAt = toISOStringSafe(new Date(Date.now() + 24 * 60 * 60 * 1000)); // 24 hours

  await MyGlobal.prisma.community_platform_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member_id: createdMemberId,
      token: verificationToken,
      token_hash: verificationTokenHash,
      expires_at: expiresAt,
      sent_at: toISOStringSafe(new Date()),
      is_used: false,
    },
  });

  // Create user profile if bio is provided
  if (bio) {
    await MyGlobal.prisma.community_platform_user_profiles.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        member_id: createdMemberId,
        bio: bio,
        join_date: toISOStringSafe(new Date()),
      },
    });
  }

  // Generate JWT tokens
  const accessTokenPayload = {
    userId: createdMemberId,
    email: createdMember.email,
    type: "moderator",
  };

  const refreshTokenPayload = {
    userId: createdMemberId,
    tokenType: "refresh",
  };

  const accessToken = jwt.sign(
    accessTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );

  const refreshToken = jwt.sign(
    refreshTokenPayload,
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );

  const expiredAt = toISOStringSafe(new Date(Date.now() + 1 * 60 * 60 * 1000)); // 1 hour from now
  const refreshableUntil = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  ); // 7 days from now

  return {
    id: createdMemberId,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: expiredAt,
      refreshable_until: refreshableUntil,
    },
  };
}
