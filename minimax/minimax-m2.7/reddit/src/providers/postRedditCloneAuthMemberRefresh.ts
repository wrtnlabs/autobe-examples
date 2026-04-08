import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postRedditCloneAuthMemberRefresh(props: {
  body: IRedditCloneMember.IRefresh;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Verify refresh token
  let decoded: {
    id: string;
    session_id: string;
    type: string;
    tokenType?: string;
    created_at?: string;
  };
  try {
    decoded = jwt.verify(props.body.refreshToken, MyGlobal.env.JWT_SECRET_KEY, {
      issuer: "autobe",
    }) as typeof decoded;
  } catch {
    throw new HttpException("Invalid or expired refresh token", 401);
  }
  // 2. Validate token type
  if (decoded.type !== "member") {
    throw new HttpException("Invalid token type for this endpoint", 403);
  }
  // 3. Find and validate session
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_clone_member_id: decoded.id,
      expired_at: { gt: new Date() },
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  // 4. Optional IP validation
  if (props.body.ip !== undefined && session.ip !== props.body.ip) {
    throw new HttpException("IP address mismatch", 401);
  }
  // 5. Fetch member data (only scalar fields - relations don't exist in schema)
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: decoded.id },
    select: {
      id: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // 6. Generate new tokens
  const accessExpiresMs = Date.now() + 60 * 60 * 1000;
  const refreshExpiresMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: member.id,
      session_id: session.id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: session.id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: new Date(refreshExpiresMs),
    },
  });
  // 8. Return authorized response (relations not available in schema)
  return {
    id: member.id,
    username: member.username,
    displayName: member.username,
    bio: null,
    avatar: null,
    karmaScore: 0,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt:
      member.deleted_at !== null ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: toISOStringSafe(new Date(accessExpiresMs)),
      refreshable_until: toISOStringSafe(new Date(refreshExpiresMs)),
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
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postRedditCloneAuthMemberRefresh(props: {
//   body: IRedditCloneMember.IRefresh;
// }): Promise<IRedditCloneMember.IAuthorized> {
//   return {
//     id: ...,
//     username: ...,
//     displayName: ...,
//     bio: ...,
//     avatar: await RedditCloneFileAssociationAtSummaryTransformer.transform(...),
//     karmaScore: ...,
//     createdAt: ...,
//     updatedAt: ...,
//     deletedAt: ...,
//     token: ...,
//   };
// }
// ```
//--------------------------------------------------------------