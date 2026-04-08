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

export async function postRedditCloneAuthMemberJoin(props: {
  ip: string;
  body: IRedditCloneMember.IJoin;
}): Promise<IRedditCloneMember.IAuthorized> {
  // 1. Check for existing email
  const existingEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  // 2. Check for existing username
  const existingUsername = await MyGlobal.prisma.reddit_clone_members.findFirst(
    {
      where: { username: props.body.username },
    },
  );
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  // 3. Generate IDs
  const memberId = v4() as string & tags.Format<"uuid">;
  const sessionId = v4() as string & tags.Format<"uuid">;
  const karmaId = v4() as string & tags.Format<"uuid">;
  const profileId = v4() as string & tags.Format<"uuid">;
  const verificationId = v4() as string & tags.Format<"uuid">;
  // 4. Generate timestamps
  const nowIso = new Date().toISOString() as string & tags.Format<"date-time">;
  const verificationExpiresIso = new Date(
    Date.now() + 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const accessExpiresIso = new Date(
    Date.now() + 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  const refreshExpiresIso = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString() as string & tags.Format<"date-time">;
  // 5. Hash password
  const passwordHash = await PasswordUtil.hash(props.body.password);
  // 6. Create member record
  await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: passwordHash,
      username: props.body.username,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // 7. Create user karma record (initial score: 0)
  await MyGlobal.prisma.reddit_clone_user_karmas.create({
    data: {
      id: karmaId,
      reddit_clone_member_id: memberId,
      karma_score: 0,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 8. Create user profile
  await MyGlobal.prisma.reddit_clone_user_profiles.create({
    data: {
      id: profileId,
      reddit_clone_member_id: memberId,
      display_name: props.body.username,
      bio: null,
      reddit_clone_file_association_id: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 9. Create email verification record
  const verificationToken = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_clone_member_email_verifications.create({
    data: {
      id: verificationId,
      reddit_clone_member_id: memberId,
      token: verificationToken,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      verified_at: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 10. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "1h", issuer: "autobe" },
  );
  const refreshToken = jwt.sign(
    {
      type: "member",
      id: memberId,
      session_id: sessionId,
      tokenType: "refresh",
      created_at: nowIso,
    },
    MyGlobal.env.JWT_SECRET_KEY,
    { expiresIn: "7d", issuer: "autobe" },
  );
  // 11. Create session record
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      reddit_clone_member_id: memberId,
      access_token: accessToken,
      refresh_token: refreshToken,
      ip: props.body.ip ?? props.ip,
      href: props.body.href,
      referrer: props.body.referrer,
      created_at: new Date(),
      expired_at: new Date(Date.now() + 60 * 60 * 1000),
    },
  });
  // 12. Return authorized response
  return {
    id: memberId,
    username: props.body.username,
    displayName: props.body.username,
    bio: null,
    avatar: null,
    karmaScore: 0 as number & tags.Type<"int32">,
    createdAt: nowIso,
    updatedAt: nowIso,
    deletedAt: null,
    token: {
      access: accessToken,
      refresh: refreshToken,
      expired_at: accessExpiresIso,
      refreshable_until: refreshExpiresIso,
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
// export async function postRedditCloneAuthMemberJoin(props: {
//   ip: string;
//   body: IRedditCloneMember.IJoin;
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