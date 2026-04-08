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

export async function postRedditPlatformAuthMemberRefresh(props: {
  body: IRedditPlatformMember.IRefresh;
}): Promise<IRedditPlatformMember.IAuthorized> {
  // 1. Verify refresh token signature
  const decoded = jwt.verify(
    props.body.refresh_token,
    MyGlobal.env.JWT_SECRET_KEY,
    { issuer: "autobe" },
  ) as {
    id: string & tags.Format<"uuid">;
    session_id: string & tags.Format<"uuid">;
    type: "member";
    created_at: string & tags.Format<"date-time">;
  };
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  // 3. Validate session exists and is active
  const session =
    await MyGlobal.prisma.reddit_platform_member_sessions.findFirst({
      where: {
        id: decoded.session_id,
        reddit_platform_member_id: decoded.id,
      },
    });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Validate session not deleted
  if (session.deleted_at !== null) {
    throw new HttpException("Session has been revoked", 401);
  }
  // 5. Validate session not expired (compare strings directly)
  const nowIso = toISOStringSafe(new Date());
  const sessionExpiredAtIso = toISOStringSafe(session.expired_at);
  if (sessionExpiredAtIso < nowIso) {
    throw new HttpException("Session expired", 401);
  }
  // 6. Validate session not revoked
  if (session.revoked_at !== null) {
    throw new HttpException("Session has been revoked", 401);
  }
  // 7. Validate member exists and is not deleted
  const member =
    await MyGlobal.prisma.reddit_platform_members.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        email: true,
        username: true,
        karma: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  // 8. Generate new tokens with same session_id
  const accessExpiresAt = toISOStringSafe(
    new Date(Date.now() + 60 * 60 * 1000),
  );
  const refreshExpiresAt = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const currentIso = toISOStringSafe(new Date());
  const accessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: currentIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: currentIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 9. Update session with new tokens
  await MyGlobal.prisma.reddit_platform_member_sessions.update({
    where: { id: session.id },
    data: {
      token: accessToken,
      refresh_token: refreshToken,
      expired_at: new Date(accessExpiresAt),
      updated_at: new Date(),
    },
  });
  // 10. Transform member data to response
  const deletedAtIso: (string & tags.Format<"date-time">) | null =
    member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null;
  return {
    id: member.id,
    username: member.username,
    karma: member.karma,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at: deletedAtIso,
    email: member.email,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresAt,
      refreshable_until: refreshExpiresAt,
    } satisfies IAuthorizationToken,
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
// export async function postRedditPlatformAuthMemberRefresh(props: {
//   body: IRedditPlatformMember.IRefresh;
// }): Promise<IRedditPlatformMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------