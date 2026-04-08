import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { RedditCloneCommunityModeratorAtSummaryTransformer } from "../transformers/RedditCloneCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneMemberCommunitiesCommunityIdModerators(props: {
  member: MemberPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCloneCommunityModerator.IRequest;
}): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
  // Validate community exists (404 if not found)
  await MyGlobal.prisma.reddit_clone_communities.findUniqueOrThrow({
    where: { id: props.communityId },
    select: { id: true },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // WHERE clause: filter by community and optional role
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    ...(props.body.role && { role: props.body.role }),
  } satisfies Prisma.reddit_clone_community_moderatorsWhereInput;
  // ORDER BY: role (owner first, alphabetically), then created_at ascending
  const orderByInput = [
    { role: "asc" as const },
    { created_at: "asc" as const },
  ] satisfies Prisma.reddit_clone_community_moderatorsOrderByWithRelationInput[];
  // Execute queries sequentially (not parallel)
  const records =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCloneCommunityModeratorAtSummaryTransformer.transform,
    ),
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
// import { IRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityModerator";
// import { IPageIRedditCloneCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityModerator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneMemberCommunitiesCommunityIdModerators(props: {
//   member: MemberPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCloneCommunityModerator.IRequest;
// }): Promise<IPageIRedditCloneCommunityModerator.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
//     ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneCommunityModeratorAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------