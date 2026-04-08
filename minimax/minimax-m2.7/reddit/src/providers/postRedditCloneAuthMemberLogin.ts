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

export async function postRedditCloneAuthMemberLogin(props: {
  ip: string;
  body: IRedditCloneMember.ILogin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Find member by email with password_hash explicitly selected
  const member = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: {
      email: props.body.email,
      deleted_at: null,
    },
    select: {
      id: true,
      email: true,
      password_hash: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      profile: {
        select: {
          id: true,
          display_name: true,
          bio: true,
          reddit_clone_file_association_id: true,
        },
      },
      karma: {
        select: {
          karma_score: true,
        },
      },
    },
  });
  if (!member) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 2. Verify password
  const isValidPassword = await PasswordUtil.verify(
    props.body.password,
    member.password_hash,
  );
  if (!isValidPassword) {
    throw new HttpException("Invalid credentials", 401);
  }
  // 3. Generate session ID and token expiration times
  const sessionId = v4();
  const now = toISOStringSafe(new Date());
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  // 4. Create JWT tokens
  const tokenPayload = {
    type: "member" as const,
    id: member.id,
    session_id: sessionId,
    created_at: now,
  };
  const accessToken = jwt.sign(tokenPayload, MyGlobal.env.JWT_SECRET_KEY, {
    expiresIn: "1h",
    issuer: "autobe",
  });
  const refreshToken = jwt.sign(
    { ...tokenPayload, tokenType: "refresh" as const },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 5. Store session in database
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_member_id: member.id,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(accessExpires),
    },
  });
  // 6. Fetch avatar if exists
  let avatar: IRedditCloneFileAssociation.ISummary | null = null;
  if (member.profile?.reddit_clone_file_association_id) {
    const fileAssociation =
      await MyGlobal.prisma.reddit_clone_file_associations.findUnique({
        where: { id: member.profile.reddit_clone_file_association_id },
        ...RedditCloneFileAssociationAtSummaryTransformer.select(),
      });
    if (fileAssociation) {
      avatar =
        await RedditCloneFileAssociationAtSummaryTransformer.transform(
          fileAssociation,
        );
    }
  }
  // 7. Return IAuthorized response
  return {
    id: member.id,
    username: member.username,
    displayName: member.profile?.display_name ?? member.username,
    bio: member.profile?.bio ?? null,
    avatar: avatar,
    karmaScore: member.karma?.karma_score ?? 0,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpires,
      refreshable_until: refreshExpires,
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
// export async function postRedditCloneAuthMemberLogin(props: {
//   ip: string;
//   body: IRedditCloneMember.ILogin;
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