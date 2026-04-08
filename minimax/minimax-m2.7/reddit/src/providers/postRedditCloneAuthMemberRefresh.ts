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
import { RedditCloneFileAssociationAtSummaryTransformer } from "../transformers/RedditCloneFileAssociationAtSummaryTransformer";
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
    throw new HttpException("Invalid token type for member refresh", 403);
  }
  // 3. Validate session exists and not expired
  const session = await MyGlobal.prisma.reddit_clone_member_sessions.findFirst({
    where: {
      id: decoded.session_id,
      reddit_clone_member_id: decoded.id,
    },
  });
  if (!session) {
    throw new HttpException("Session expired or revoked", 401);
  }
  if (session.expired_at < new Date()) {
    throw new HttpException("Session has expired", 401);
  }
  // 4. Validate IP address if provided (optional security check)
  if (props.body.ip !== undefined && session.ip !== props.body.ip) {
    throw new HttpException("IP address mismatch", 401);
  }
  // 5. Validate member exists and not deleted
  const member = await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
    where: { id: decoded.id },
  });
  if (member.deleted_at !== null) {
    throw new HttpException("Account has been deleted", 403);
  }
  // 6. Generate new access and refresh tokens (same session_id)
  const accessExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const newAccessToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const newRefreshToken = jwt.sign(
    {
      type: "member",
      id: decoded.id,
      session_id: decoded.session_id,
      tokenType: "refresh",
      created_at: new Date().toISOString(),
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 7. Update session with new tokens and extended expiration
  await MyGlobal.prisma.reddit_clone_member_sessions.update({
    where: { id: decoded.session_id },
    data: {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
      expired_at: refreshExpires,
    },
  });
  // 8. Query member with profile, karma, and avatar
  const memberData =
    await MyGlobal.prisma.reddit_clone_members.findUniqueOrThrow({
      where: { id: decoded.id },
      select: {
        id: true,
        username: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        profile: {
          select: {
            display_name: true,
            bio: true,
            avatarFileAssociation:
              RedditCloneFileAssociationAtSummaryTransformer.select(),
          },
        },
        karma: {
          select: {
            karma_score: true,
          },
        },
      },
    });
  // 9. Transform and return IAuthorized response
  const avatar = memberData.profile?.avatarFileAssociation
    ? await RedditCloneFileAssociationAtSummaryTransformer.transform(
        memberData.profile.avatarFileAssociation,
      )
    : null;
  return {
    id: memberData.id as string & tags.Format<"uuid">,
    username: memberData.username,
    displayName: memberData.profile?.display_name ?? memberData.username,
    bio: memberData.profile?.bio ?? undefined,
    avatar: avatar,
    karmaScore:
      memberData.karma?.karma_score ?? (0 as number & tags.Type<"int32">),
    createdAt: memberData.created_at.toISOString() as string &
      tags.Format<"date-time">,
    updatedAt: memberData.updated_at.toISOString() as string &
      tags.Format<"date-time">,
    deletedAt:
      memberData.deleted_at?.toISOString() ??
      (null as (string & tags.Format<"date-time">) | null),
    token: {
      access: newAccessToken,
      refresh: newRefreshToken,
      expired_at: accessExpires.toISOString() as string &
        tags.Format<"date-time">,
      refreshable_until: refreshExpires.toISOString() as string &
        tags.Format<"date-time">,
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