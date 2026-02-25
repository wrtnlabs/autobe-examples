import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityMemberTransformer } from "../transformers/CommunityMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postCommunityAuthMemberLogin(props: {
  ip: string;
  body: ICommunityMember.ILogin;
}): Promise<ICommunityMember.IAuthorized> {
  // 1. Find member by email with password_hash
  const member = await MyGlobal.prisma.community_members.findFirst({
    where: {
      email: { equals: props.body.email, mode: "insensitive" },
      deleted_at: null,
    },
    select: {
      ...CommunityMemberTransformer.select().select,
      password_hash: true,
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValid = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValid) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Calculate expiration times
  const now = new Date();
  const accessExpires = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes
  const refreshExpires = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
  // 4. Generate session ID
  const sessionId = v4();
  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "30m", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: toISOStringSafe(now),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "14d", issuer: "autobe" },
  );
  // 6. Create session record with actual tokens
  await MyGlobal.prisma.community_member_sessions.create({
    data: {
      id: sessionId,
      community_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      access_expires_at: accessExpires,
      refresh_expires_at: refreshExpires,
      ip: props.ip ?? "",
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      expired_at: refreshExpires,
    },
  });
  // 7. Construct token object
  const token: IAuthorizationToken = {
    access: accessToken,
    refresh: refreshToken,
    expired_at: toISOStringSafe(accessExpires),
    refreshable_until: toISOStringSafe(refreshExpires),
  };
  // 8. Transform member and return IAuthorized
  const transformedMember = await CommunityMemberTransformer.transform(member);
  return {
    ...transformedMember,
    email: props.body.email,
    accessToken,
    expiredAt: toISOStringSafe(accessExpires),
    token,
  };
}
