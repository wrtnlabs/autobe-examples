import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCommunityAuthMemberJoin(props: {
  ip: string;
  body: IRedditCommunityMember.IJoin;
}): Promise<IRedditCommunityMember.IAuthorized> {
  // Validate email format using typia
  try {
    typia.assert<string & tags.Format<"email">>(props.body.email);
  } catch {
    throw new HttpException("Invalid email format", 400);
  }
  // Check email uniqueness
  const existingByEmail =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { email: props.body.email },
    });
  if (existingByEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // Check username uniqueness
  const existingByUsername =
    await MyGlobal.prisma.reddit_community_members.findFirst({
      where: { username: props.body.username },
    });
  if (existingByUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // Validate password strength
  if (props.body.password.length < 8) {
    throw new HttpException("Password too weak", 400);
  }
  // Hash password
  const hashedPassword = await PasswordUtil.hash(props.body.password);
  // Get current timestamp as ISO string
  const currentTimestamp = new Date().toISOString();
  const created_at: string & tags.Format<"date-time"> = currentTimestamp;
  const updated_at: string & tags.Format<"date-time"> = currentTimestamp;
  // Create member record
  const member = await MyGlobal.prisma.reddit_community_members.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      email: props.body.email,
      password_hash: hashedPassword,
      username: props.body.username,
      created_at: created_at,
      updated_at: updated_at,
      deleted_at: null,
    },
  });
  // Create email verification token
  const verificationExpiresAtDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const verificationExpiresAt: string & tags.Format<"date-time"> =
    verificationExpiresAtDate.toISOString();
  const verificationToken = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_community_member_email_verifications.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      reddit_community_member_id: member.id,
      token: verificationToken,
      expires_at: verificationExpiresAt,
      created_at: created_at,
      updated_at: updated_at,
      deleted_at: null,
    },
  });
  // Create session
  const accessExpiresDate = new Date(Date.now() + 60 * 60 * 1000);
  const refreshExpiresDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const accessExpiresAt: string & tags.Format<"date-time"> =
    accessExpiresDate.toISOString();
  const refreshExpiresAt: string & tags.Format<"date-time"> =
    refreshExpiresDate.toISOString();
  const session = await MyGlobal.prisma.reddit_community_member_sessions.create(
    {
      data: {
        id: v4() as string & tags.Format<"uuid">,
        reddit_community_member_id: member.id,
        ip: props.body.ip ?? props.ip,
        href: props.body.href,
        referrer: props.body.referrer,
        created_at: created_at,
        updated_at: updated_at,
        expired_at: accessExpiresAt,
        deleted_at: null,
      },
    },
  );
  // Generate JWT tokens
  const accessPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    created_at: created_at,
  };
  const access = jwt.sign(accessPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshPayload = {
    type: "member" as const,
    id: member.id,
    session_id: session.id,
    tokenType: "refresh" as const,
    created_at: created_at,
  };
  const refresh = jwt.sign(refreshPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "7d",
    issuer: "autobe",
  });
  // Build token object
  const token: IAuthorizationToken = {
    access,
    refresh,
    expired_at: accessExpiresAt,
    refreshable_until: refreshExpiresAt,
  };
  // Build and return authorized response
  return {
    id: member.id,
    email: member.email,
    username: member.username,
    created_at: created_at,
    updated_at: updated_at,
    deleted_at: member.deleted_at as (string & tags.Format<"date-time">) | null,
    token,
  } satisfies IRedditCommunityMember.IAuthorized;
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
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCommunityAuthMemberJoin(props: {
//   ip: string;
//   body: IRedditCommunityMember.IJoin;
// }): Promise<IRedditCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------