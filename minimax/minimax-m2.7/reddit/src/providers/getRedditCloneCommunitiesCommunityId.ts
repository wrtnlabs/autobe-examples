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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityId(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunity.IInvert> {
  const record =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
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
        icon: {
          select: {
            id: true,
            created_at: true,
            file: {
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
            },
          },
        },
      },
    });
  if (record.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (!record.icon) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    subscriberCount: record.subscriber_count,
    owner: {
      id: record.member.id,
      username: record.member.username,
    } satisfies IRedditCloneMember.ISummary,
    icon: {
      id: record.icon.id,
      createdAt: record.icon.created_at.toISOString(),
      community: {
        id: record.id,
        name: record.name,
        description: record.description,
        subscriberCount: record.subscriber_count,
        owner: {
          id: record.member.id,
          username: record.member.username,
        } satisfies IRedditCloneMember.ISummary,
      } satisfies IRedditCloneCommunity.ISummary,
      file: {
        id: record.icon.file.id,
        originalFilename: record.icon.file.original_filename,
        mimeType: record.icon.file.mime_type,
        fileSize: record.icon.file.file_size,
        status: record.icon.file.status,
        createdAt: record.icon.file.created_at.toISOString(),
        uploader: {
          id: record.icon.file.uploader.id,
          username: record.icon.file.uploader.username,
        } satisfies IRedditCloneMember.ISummary,
        thumbnails: record.icon.file.thumbnails?.map((t) => ({
          id: t.id,
          width: t.width,
          height: t.height,
          variant: t.variant,
          thumbnailPath: t.thumbnail_path,
          createdAt: t.created_at.toISOString(),
        })),
      } satisfies IRedditCloneFile.ISummary,
    } satisfies IRedditCloneCommunityIcon.IInvert,
    createdAt: record.created_at.toISOString(),
    updatedAt: record.updated_at.toISOString(),
    deletedAt: record.deleted_at ? record.deleted_at.toISOString() : null,
  } satisfies IRedditCloneCommunity.IInvert;
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
// import { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getRedditCloneCommunitiesCommunityId(props: {
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunity.IInvert> {
//   const record = await MyGlobal.prisma.reddit_clone_communities.findFirstOrThrow({
//     ...RedditCloneCommunityAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------