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
import { RedditCloneCommunityIconAtInvertTransformer } from "../transformers/RedditCloneCommunityIconAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getRedditCloneCommunitiesCommunityIdIcon(props: {
  communityId: string & tags.Format<"uuid">;
}): Promise<IRedditCloneCommunityIcon.IInvert | null> {
  // Verify community exists first (returns 404 if not found)
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  // Query icon for this community (icon is optional, so use regular findFirst)
  const icon = await MyGlobal.prisma.reddit_clone_community_icons.findFirst({
    ...RedditCloneCommunityIconAtInvertTransformer.select(),
    where: { reddit_clone_community_id: props.communityId },
  });
  // Return null if no icon exists
  if (!icon) {
    return null;
  }
  // Transform and return the icon record
  return await RedditCloneCommunityIconAtInvertTransformer.transform(icon);
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
// export async function getRedditCloneCommunitiesCommunityIdIcon(props: {
//   communityId: string & tags.Format<"uuid">;
// }): Promise<IRedditCloneCommunityIcon.IInvert> {
//   const record = await MyGlobal.prisma.reddit_clone_community_icons.findFirstOrThrow({
//     ...RedditCloneCommunityIconAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await RedditCloneCommunityIconAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------