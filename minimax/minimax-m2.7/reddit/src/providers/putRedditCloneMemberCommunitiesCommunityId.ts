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
import { RedditCloneCommunityTransformer } from "../transformers/RedditCloneCommunityTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putRedditCloneMemberCommunitiesCommunityId(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunity.IUpdate;
}): Promise<IRedditCloneCommunity> {
  // 1. Find community and verify ownership
  const community =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      select: {
        id: true,
        reddit_clone_member_id: true,
        name: true,
      },
    });
  // 2. Authorization check - only owner can update
  if (community.reddit_clone_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate name uniqueness if name is being changed
  if (props.body.name !== undefined && props.body.name !== community.name) {
    const existing = await MyGlobal.prisma.reddit_clone_communities.findFirst({
      where: {
        name: props.body.name,
        deleted_at: null,
        NOT: { id: props.communityId },
      },
    });
    if (existing) {
      throw new HttpException("Community name already exists", 400);
    }
  }
  // 4. Build update data - only include fields that are provided
  const updateData: {
    name?: string;
    description?: string;
    updated_at: string;
  } = {
    updated_at: toISOStringSafe(new Date()),
  };
  if (props.body.name !== undefined) {
    updateData.name = props.body.name;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  // 5. Update community
  await MyGlobal.prisma.reddit_clone_communities.update({
    where: { id: props.communityId },
    data: updateData,
  });
  // 6. Handle icon update if provided
  if (props.body.icon !== undefined) {
    // Verify the file exists and is processed
    const file = await MyGlobal.prisma.reddit_clone_files.findUniqueOrThrow({
      where: { id: props.body.icon.fileId },
      select: { id: true, status: true },
    });
    if (file.status !== "processed") {
      throw new HttpException(
        "File must be processed before setting as icon",
        400,
      );
    }
    // Upsert the icon record
    await MyGlobal.prisma.reddit_clone_community_icons.upsert({
      where: { reddit_clone_community_id: props.communityId },
      create: {
        id: v4(),
        reddit_clone_community_id: props.communityId,
        reddit_clone_file_id: props.body.icon.fileId,
        created_at: toISOStringSafe(new Date()) as any,
      },
      update: {
        reddit_clone_file_id: props.body.icon.fileId,
      },
    });
  }
  // 7. Fetch and return updated community using transformer
  const updated =
    await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
      where: { id: props.communityId },
      ...RedditCloneCommunityTransformer.select(),
    });
  return await RedditCloneCommunityTransformer.transform(updated);
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
// import { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putRedditCloneMemberCommunitiesCommunityId(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunity.IUpdate;
// }): Promise<IRedditCloneCommunity> {
//   await MyGlobal.prisma.reddit_clone_communities.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
//     where: { ... },
//     ...RedditCloneCommunityTransformer.select(),
//   });
//   return await RedditCloneCommunityTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------