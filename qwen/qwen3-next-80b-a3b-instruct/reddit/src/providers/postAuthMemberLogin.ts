import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { MemberPayload } from "../decorators/payload/MemberPayload";

export async function postAuthMemberLogin(props: {
  member: MemberPayload;
  body: ICommunityPlatformMember.ILogin;
}): Promise<ICommunityPlatformMember.IAuthorized> {
  // Extract input
  const { email, password } = props.body;

  // Find member by email
  const member = await MyGlobal.prisma.community_platform_member.findUnique({
    where: { email },
  });

  // Check if member exists and is active
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if account is deleted
  if (member.deleted_at !== null) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Check if email is verified
  if (!member.is_verified) {
    throw new HttpException("Email not verified", 403);
  }

  // Verify password
  const isValid = await PasswordUtil.verify(password, member.password_hash);
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }

  // Generate token expiration times
  const now = toISOStringSafe(new Date());
  const fifteenMinutesLater = toISOStringSafe(
    new Date(Date.now() + 15 * 60 * 1000),
  );
  const sevenDaysLater = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );

  // Generate JWT tokens
  const accessToken = jwt.sign(
    { userId: member.id, type: "member" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "15m", issuer: "autobe" },
  );

  const refreshToken = jwt.sign(
    { userId: member.id, tokenType: "refresh" },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );

  // Hash tokens for secure storage
  const hashedRefreshToken = await PasswordUtil.hash(refreshToken);
  const hashedAccessToken = await PasswordUtil.hash(accessToken);

  // Create session in database
  await MyGlobal.prisma.community_platform_user_sessions.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: member.id } },
      refresh_token_hash: hashedRefreshToken,
      access_token_hash: hashedAccessToken,
      ip_address: "",
      user_agent: "",
      session_start: now,
      session_expiry: sevenDaysLater,
      is_active: true,
      device_type: "web",
    } satisfies Prisma.community_platform_user_sessionsCreateInput,
  });

  // Return response
  return {
    id: member.id,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: fifteenMinutesLater,
      refreshable_until: sevenDaysLater,
    },
  } satisfies ICommunityPlatformMember.IAuthorized;
}
