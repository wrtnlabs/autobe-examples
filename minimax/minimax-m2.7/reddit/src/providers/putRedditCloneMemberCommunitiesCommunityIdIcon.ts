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
import { RedditCloneCommunityAtInvertTransformer } from "../transformers/RedditCloneCommunityAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityIdIcon(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityIcon.IUpdate;
}): Promise<IRedditCloneCommunity.IInvert> {
  // 1. Verify community exists and is not soft-deleted
  const community = await MyGlobal.prisma.reddit_clone_communities.findFirst({
    where: {
      id: props.communityId,
      deleted_at: null,
    },
    select: {
      id: true,
      reddit_clone_member_id: true,
    },
  });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Verify authenticated user is owner OR moderator
  const isOwner = community.reddit_clone_member_id === props.member.id;
  const isModerator =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  if (!isOwner && isModerator === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify file exists, is not deleted, and has status = 'processed'
  const file = await MyGlobal.prisma.reddit_clone_files.findFirst({
    where: {
      id: props.body.fileId,
      deleted_at: null,
      status: "processed",
    },
    select: {
      id: true,
    },
  });
  if (file === null) {
    throw new HttpException("File not found, deleted, or not processed", 400);
  }
  // 4. Verify file association exists with target_type='community' and target_id=communityId
  const fileAssociation =
    await MyGlobal.prisma.reddit_clone_file_associations.findFirst({
      where: {
        reddit_clone_file_id: props.body.fileId,
        target_type: "community",
        target_id: props.communityId,
      },
      select: {
        id: true,
      },
    });
  if (fileAssociation === null) {
    throw new HttpException(
      "File is not properly associated with this community",
      400,
    );
  }
  // 5. Use transaction to delete existing icon and create new one
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing icon if any
    await tx.reddit_clone_community_icons.deleteMany({
      where: {
        reddit_clone_community_id: props.communityId,
      },
    });
    // Create new icon
    await tx.reddit_clone_community_icons.create({
      data: {
        id: v4(),
        reddit_clone_community_id: props.communityId,
        reddit_clone_file_id: props.body.fileId,
        created_at: new Date(),
      },
    });
  });
  // 6. Return updated community with icon
  const updatedCommunity =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityAtInvertTransformer.select(),
    });
  return await RedditCloneCommunityAtInvertTransformer.transform(
    updatedCommunity,
  );
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