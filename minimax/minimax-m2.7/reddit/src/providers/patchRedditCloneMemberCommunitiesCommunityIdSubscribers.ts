import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
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

export async function patchRedditCloneMemberCommunitiesCommunityIdSubscribers(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneSubscription.ISubscriberRequest;
}): Promise<IPageIRedditCloneSubscription.ISubscriberSummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const orderDirection = props.body.order === "asc" ? "asc" : "desc";
  const sortField = props.body.sort ?? "created_at";
  const whereInput = {
    reddit_clone_community_id: props.communityId,
  } satisfies Prisma.reddit_clone_subscriptionsWhereInput;
  const subscriptions =
    await MyGlobal.prisma.reddit_clone_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: {
        [sortField]: orderDirection,
      } as Prisma.reddit_clone_subscriptionsOrderByWithRelationInput,
      select: {
        id: true,
        created_at: true,
        reddit_clone_member_id: true,
      },
    });
  const total = await MyGlobal.prisma.reddit_clone_subscriptions.count({
    where: whereInput,
  });
  const memberIds = subscriptions.map((sub) => sub.reddit_clone_member_id);
  const members = await MyGlobal.prisma.reddit_clone_members.findMany({
    where: {
      id: { in: memberIds },
    },
    select: {
      id: true,
      username: true,
      profile: {
        select: {
          display_name: true,
        },
      },
      karma: {
        select: {
          karma_score: true,
        },
      },
    },
  });
  const fileAssociations =
    await MyGlobal.prisma.reddit_clone_file_associations.findMany({
      where: {
        target_id: { in: memberIds },
        target_type: "user",
      },
      select: {
        id: true,
        target_id: true,
        file: {
          select: {
            id: true,
            original_filename: true,
            stored_filename: true,
            mime_type: true,
            file_size: true,
            storage_path: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
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
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const avatarMap = new Map(
    fileAssociations.map((fa) => [fa.target_id, fa.file]),
  );
  const transformedData = subscriptions.map((sub) => {
    const member = memberMap.get(sub.reddit_clone_member_id);
    const avatarFile = avatarMap.get(sub.reddit_clone_member_id);
    let avatar: IRedditCloneFile | undefined = undefined;
    if (avatarFile) {
      avatar = {
        id: avatarFile.id,
        originalFilename: avatarFile.original_filename,
        storedFilename: avatarFile.stored_filename,
        mimeType: avatarFile.mime_type,
        fileSize: avatarFile.file_size,
        storagePath: avatarFile.storage_path,
        status: avatarFile.status,
        createdAt: toISOStringSafe(avatarFile.created_at),
        updatedAt: toISOStringSafe(avatarFile.updated_at),
        deletedAt: avatarFile.deleted_at
          ? toISOStringSafe(avatarFile.deleted_at)
          : null,
        uploader: {
          id: avatarFile.uploader.id,
          username: avatarFile.uploader.username,
        },
        thumbnails: avatarFile.thumbnails.map((thumb) => ({
          items: {
            id: thumb.id,
            width: thumb.width,
            height: thumb.height,
            variant: thumb.variant,
            thumbnailPath: thumb.thumbnail_path,
            createdAt: toISOStringSafe(thumb.created_at),
          },
        })),
        scans: [],
        associations: [],
      };
    }
    return {
      id: sub.id,
      createdAt: toISOStringSafe(sub.created_at),
      username: member?.username ?? "",
      displayName: member?.profile?.display_name ?? null,
      avatar: avatar,
      karmaScore: member?.karma?.karma_score ?? 0,
    } satisfies IRedditCloneSubscription.ISubscriberSummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
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
// import { IRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneSubscription";
// import { IPageIRedditCloneSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneSubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneFileScan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileScan";
// import { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberCommunitiesCommunityIdSubscribers(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneSubscription.ISubscriberRequest;
// }): Promise<IPageIRedditCloneSubscription.ISubscriberSummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------