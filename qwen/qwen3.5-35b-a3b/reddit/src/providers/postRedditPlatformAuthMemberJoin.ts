import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditPlatformAuthMemberJoin(props: {
  ip: string;
  body: IRedditPlatformMember.IJoin;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Check duplicate email
  const existingEmail = await MyGlobal.prisma.reddit_platform_members.findFirst(
    {
      where: { email: props.body.email },
    },
  );
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check duplicate username
  const existingUsername =
    await MyGlobal.prisma.reddit_platform_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Create member (hash password via PasswordUtil)
  const now = new Date();
  const member = await MyGlobal.prisma.reddit_platform_members.create({
    data: {
      id: v4(),
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      karma: 0,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 4. Create email verification token (expires in 24 hours)
  const emailExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString();
  const verificationToken = v4();
  await MyGlobal.prisma.reddit_platform_member_email_verifications.create({
    data: {
      id: v4(),
      reddit_platform_member_id: member.id,
      email: props.body.email,
      token: verificationToken,
      expires_at: new Date(emailExpiresAt),
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });
  // 5. Create session with placeholder JWT (will update after token generation)
  const accessExpiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const refreshExpiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const session = await MyGlobal.prisma.reddit_platform_member_sessions.create({
    data: {
      id: v4(),
      reddit_platform_member_id: member.id,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: now,
      updated_at: now,
      deleted_at: null,
      expired_at: new Date(accessExpiresAt),
      revoked_at: null,
      token: "placeholder",
      refresh_token: "placeholder",
    },
  });
  // 6. Sign JWT tokens
  const jwtPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: now.toISOString(),
  };
  const accessToken = jwt.sign(jwtPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    ...jwtPayload,
    tokenType: "refresh" as const,
  };
  const refreshToken = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Update session with actual tokens
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      token: accessToken,
      refresh_token: refreshToken,
    },
  });
  // 7. Return IAuthorized
  return {
    id: member.id,
    username: member.username,
    karma: member.karma,
    created_at: member.created_at.toISOString(),
    updated_at: member.updated_at.toISOString(),
    deleted_at: member.deleted_at?.toISOString() ?? null,
    email: member.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    },
  } satisfies IRedditPlatformMember.IAuthorized;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditPlatformAuthMemberJoin(props: {
//   ip: string;
//   body: IRedditPlatformMember.IJoin;
// }): Promise<IRedditPlatformMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------