import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditLikeCommunityAuthMemberRefresh(props: {
  body: IREdditLikeCommunityMember.IRefresh;
}): Promise<IREdditLikeCommunityMember.IAuthorized> {
  /* 1. Decode and verify the refresh token */
  let verified: {
    id: string;
    session_id: string;
    type: string;
  };
  try {
    const decoded = jwt.verify(
      props.body.refresh,
      MyGlobal.env.JWT_SECRET_KEY,
      {
        issuer: "autobe",
      },
    );
    if (typeof decoded !== "object" || decoded === null) {
      throw new HttpException("Invalid or expired refresh token", 401);
    }
    verified = typia.assert<{
      id: string;
      session_id: string;
      type: string;
    }>(decoded);
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  /* 2. Validate token type is member */
  if (verified.type !== "member") {
    throw new HttpException("Invalid token type", 401);
  }
  /* 3. Fetch member with profile in single query */
  const member =
    await MyGlobal.prisma.reddit_like_community_members.findUniqueOrThrow({
      where: { id: verified.id },
      select: {
        id: true,
        username: true,
        email: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            display_name: true,
            bio: true,
            karma: true,
          },
        },
      },
    });
  /* 4. Reject deleted accounts */
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 401);
  }
  /* 5. Validate session exists and belongs to this member */
  const session =
    await MyGlobal.prisma.reddit_like_community_member_sessions.findFirst({
      where: {
        id: verified.session_id,
        reddit_like_community_member_id: verified.id,
      },
    });
  if (session === null) {
    throw new HttpException("Session expired or revoked", 401);
  }
  /* 6. Generate new JWT token pair preserving session_id */
  const nowMs = Date.now();
  const accessExpiresMs = nowMs + 60 * 60 * 1000;
  const refreshExpiresMs = nowMs + 7 * 24 * 60 * 60 * 1000;
  const accessExpireAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(accessExpiresMs),
  );
  const refreshExpireAt: string & tags.Format<"date-time"> = toISOStringSafe(
    new Date(refreshExpiresMs),
  );
  const accessToken = jwt.sign(
    {
      type: "member",
      id: verified.id,
      session_id: verified.session_id,
      created_at: toISOStringSafe(new Date(nowMs)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "1h",
      issuer: "autobe",
    },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: verified.id,
      session_id: verified.session_id,
      tokenType: "refresh",
      created_at: toISOStringSafe(new Date(nowMs)),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    {
      expiresIn: "7d",
      issuer: "autobe",
    },
  );
  /* 7. Update session expiration */
  await MyGlobal.prisma.reddit_like_community_member_sessions.update({
    where: { id: verified.session_id },
    data: { expired_at: new Date(refreshExpiresMs) },
  });
  /* 8. Return authorized member response */
  return {
    id: member.id,
    username: member.username,
    email: member.email,
    display_name: member.profile?.display_name ?? null,
    bio: member.profile?.bio ?? null,
    karma: member.profile?.karma ?? 0,
    created_at: toISOStringSafe(member.created_at),
    updated_at: toISOStringSafe(member.updated_at),
    deleted_at:
      member.deleted_at === null ? null : toISOStringSafe(member.deleted_at),
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpireAt,
      refreshable_until: refreshExpireAt,
    },
  };
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditLikeCommunityAuthMemberRefresh(props: {
//   body: IREdditLikeCommunityMember.IRefresh;
// }): Promise<IREdditLikeCommunityMember.IAuthorized> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------