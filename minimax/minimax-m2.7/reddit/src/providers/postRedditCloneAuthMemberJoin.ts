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
  const existingEmail = await MyGlobal.prisma.reddit_clone_members.findFirst({
    where: { email: props.body.email },
  });
  if (existingEmail) {
    throw new HttpException("Email already registered", 409);
  }
  const existingUsername = await MyGlobal.prisma.reddit_clone_members.findFirst(
    {
      where: { username: props.body.username },
    },
  );
  if (existingUsername) {
    throw new HttpException("Username already taken", 409);
  }
  const memberId = v4() as string & tags.Format<"uuid">;
  const createdAt = toISOStringSafe(new Date());
  const member = await MyGlobal.prisma.reddit_clone_members.create({
    data: {
      id: memberId,
      email: props.body.email,
      password_hash: await PasswordUtil.hash(props.body.password),
      username: props.body.username,
      created_at: createdAt,
      updated_at: createdAt,
      deleted_at: null,
    },
    select: {
      id: true,
      username: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  await MyGlobal.prisma.reddit_clone_user_profiles.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: member.id } },
      display_name: member.username,
      bio: null,
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  await MyGlobal.prisma.reddit_clone_user_karmas.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      member: { connect: { id: member.id } },
      karma_score: 0,
      created_at: createdAt,
      updated_at: createdAt,
    },
  });
  const accessExpires = toISOStringSafe(new Date(Date.now() + 60 * 60 * 1000));
  const refreshExpires = toISOStringSafe(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const sessionId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.reddit_clone_member_sessions.create({
    data: {
      id: sessionId,
      member: { connect: { id: member.id } },
      href: props.body.href,
      referrer: props.body.referrer,
      ip: props.body.ip ?? props.ip,
      expired_at: accessExpires,
      created_at: createdAt,
      access_token: "",
      refresh_token: "",
    },
  });
  const token: IAuthorizationToken = {
    access: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "1h", issuer: "autobe" },
    ),
    refresh: jwt.sign(
      {
        type: "member",
        id: member.id,
        session_id: sessionId,
        tokenType: "refresh",
        created_at: createdAt,
      },
      MyGlobal.env.JWT_SECRET_KEY,
      { expiresIn: "7d", issuer: "autobe" },
    ),
    expired_at: accessExpires,
    refreshable_until: refreshExpires,
  };
  const userProfile =
    await MyGlobal.prisma.reddit_clone_user_profiles.findUnique({
      where: { reddit_clone_member_id: member.id },
      select: {
        display_name: true,
        bio: true,
      },
    });
  const userKarma = await MyGlobal.prisma.reddit_clone_user_karmas.findUnique({
    where: { reddit_clone_member_id: member.id },
    select: {
      karma_score: true,
    },
  });
  const avatarAssociation =
    await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
      where: {
        target_id: member.id,
        target_type: "user",
      },
      select: {
        id: true,
        target_id: true,
        created_at: true,
        reddit_clone_file_id: true,
      },
    });
  let avatar: IRedditCloneFileAssociation.ISummary | undefined = undefined;
  if (avatarAssociation?.reddit_clone_file_id) {
    const avatarFile = await MyGlobal.prisma.reddit_clone_files.findUnique({
      where: { id: avatarAssociation.reddit_clone_file_id },
      select: {
        id: true,
        original_filename: true,
        mime_type: true,
        file_size: true,
        status: true,
        created_at: true,
        uploader: {
          select: {
            id: true,
            username: true,
          },
        },
        thumbnails: {
          select: {
            id: true,
            width: true,
            height: true,
            variant: true,
            thumbnail_path: true,
            created_at: true,
          },
        },
      },
    });
    if (avatarFile) {
      const thumbnailItems = avatarFile.thumbnails
        ? avatarFile.thumbnails.map(
            (t): IRedditCloneFileThumbnail.ISummary => ({
              id: t.id,
              width: t.width,
              height: t.height,
              variant: t.variant,
              thumbnailPath: t.thumbnail_path,
              createdAt: toISOStringSafe(t.created_at),
            }),
          )
        : undefined;
      avatar = {
        id: avatarAssociation.id,
        userId: avatarAssociation.target_id,
        createdAt: toISOStringSafe(avatarAssociation.created_at),
        file: {
          createdAt: toISOStringSafe(avatarFile.created_at),
          fileSize: avatarFile.file_size,
          id: avatarFile.id,
          mimeType: avatarFile.mime_type,
          originalFilename: avatarFile.original_filename,
          status: avatarFile.status,
          uploader: {
            id: avatarFile.uploader.id,
            username: avatarFile.uploader.username,
          },
          thumbnails: thumbnailItems
            ? (thumbnailItems.map(
                (item): IRedditCloneFileThumbnail => ({
                  items: item,
                }),
              ) satisfies IRedditCloneFileThumbnail[])
            : undefined,
        },
      };
    }
  }
  return {
    id: member.id,
    username: member.username,
    displayName: userProfile?.display_name ?? member.username,
    bio: userProfile?.bio ?? null,
    avatar: avatar ?? undefined,
    karmaScore: (userKarma?.karma_score ?? 0) as number & tags.Type<"int32">,
    createdAt: toISOStringSafe(member.created_at),
    updatedAt: toISOStringSafe(member.updated_at),
    deletedAt: member.deleted_at ? toISOStringSafe(member.deleted_at) : null,
    token,
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