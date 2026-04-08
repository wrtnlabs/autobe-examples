import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityIdIcon(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityIcon.IUpdate;
}): Promise<IRedditCloneCommunity.IInvert> {
  // Check community exists and auth
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: { id: props.communityId, deleted_at: null },
    select: { id: true, reddit_clone_member_id: true },
  });
  if (community === null) {
    throw new HttpException("Community not found or deleted", 404);
  }
  const isOwner = community.reddit_clone_member_id === props.member.id;
  const moderatorRecord =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: { id: true },
    });
  const isModerator = moderatorRecord !== null;
  if (!isOwner && !isModerator) {
    throw new HttpException("Forbidden", 403);
  }
  // Check file exists and is processed
  const file = await MyGlobal.prisma.reddit_clone_files.findFirst({
    where: { id: props.body.fileId, deleted_at: null, status: "processed" },
    select: { id: true },
  });
  if (file === null) {
    throw new HttpException("File not found, deleted, or not processed", 400);
  }
  // Check file association
  const fileAssociation =
    await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
      where: {
        reddit_clone_file_id: props.body.fileId,
        target_type: "community",
        target_id: props.communityId,
      },
      select: { id: true },
    });
  if (fileAssociation === null) {
    throw new HttpException("File not properly associated with community", 400);
  }
  // Transaction: delete old icon, create new icon
  const newIconId = v4() as string & tags.Format<"uuid">;
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.reddit_clone_community_icons.deleteMany({
      where: { reddit_clone_community_id: props.communityId },
    });
    await tx.reddit_clone_community_icons.create({
      data: {
        id: newIconId,
        reddit_clone_community_id: props.communityId,
        reddit_clone_file_id: props.body.fileId,
        created_at: new Date(),
      },
    });
    await tx.reddit_clone_communities.update({
      where: { id: props.communityId },
      data: { updated_at: new Date() },
    });
  });
  // Query the new icon with all nested relations
  const icon =
    await MyGlobal.prisma.reddit_clone_community_icons.findUniqueOrThrow({
      where: { id: newIconId },
      select: {
        id: true,
        created_at: true,
        reddit_clone_community_id: true,
        community: {
          select: {
            id: true,
            name: true,
            description: true,
            subscriber_count: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            member: {
              select: {
                id: true,
                username: true,
              },
            },
          },
        },
        file: {
          select: {
            id: true,
            original_filename: true,
            storage_path: true,
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
        },
      },
    });
  // Build IRedditCloneCommunity.IInvert response manually
  return {
    id: icon.community.id,
    name: icon.community.name,
    description: icon.community.description,
    subscriberCount: icon.community.subscriber_count,
    owner: {
      id: icon.community.member.id,
      username: icon.community.member.username,
    },
    icon: {
      id: icon.id,
      createdAt: icon.created_at.toISOString(),
      community: {
        id: icon.community.id,
        name: icon.community.name,
        description: icon.community.description,
        subscriberCount: icon.community.subscriber_count,
        owner: {
          id: icon.community.member.id,
          username: icon.community.member.username,
        },
      },
      file: {
        id: icon.file.id,
        createdAt: icon.file.created_at.toISOString(),
        originalFilename: icon.file.original_filename,
        mimeType: icon.file.mime_type,
        fileSize: icon.file.file_size,
        status: icon.file.status,
        uploader: {
          id: icon.file.uploader.id,
          username: icon.file.uploader.username,
        },
        thumbnails: icon.file.thumbnails?.length
          ? icon.file.thumbnails.map((t) => ({
              items: {
                id: t.id,
                width: t.width,
                height: t.height,
                variant: t.variant,
                thumbnailPath: t.thumbnail_path,
                createdAt: t.created_at.toISOString(),
              },
            }))
          : undefined,
      },
    },
    createdAt: icon.community.created_at.toISOString(),
    updatedAt: icon.community.updated_at.toISOString(),
    deletedAt: icon.community.deleted_at
      ? icon.community.deleted_at.toISOString()
      : null,
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
// import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberCommunitiesCommunityIdIcon(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityIcon.IUpdate;
// }): Promise<IRedditCloneCommunity.IInvert> {
//   await MyGlobal.prisma.reddit_clone_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommunityAtInvertTransformer.select(),
//   });
//   return await RedditCloneCommunityAtInvertTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------