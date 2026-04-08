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
  // Verify community exists
  const community = await MyGlobal.prisma.reddit_clone_communities.findUnique({
    where: { id: props.communityId },
    select: { id: true },
  });
  if (!community) {
    throw new HttpException("Community not found", 404);
  }
  // Verify requesting member is owner or moderator of this community
  const moderatorRole =
    await MyGlobal.prisma.reddit_clone_community_moderators.findFirst({
      where: {
        reddit_clone_community_id: props.communityId,
        reddit_clone_member_id: props.member.id,
        role: { in: ["owner", "moderator"] },
      },
      select: { id: true },
    });
  if (!moderatorRole) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where clause
  const whereInput = {
    reddit_clone_community_id: props.communityId,
    ...(props.body.role !== undefined && { role: props.body.role }),
  } satisfies Prisma.reddit_clone_community_moderatorsWhereInput;
  // Pagination variables
  const limit = props.body.limit ?? 20;
  let skip: number | undefined;
  let cursor:
    | {
        id: string;
        created_at: Date;
      }
    | undefined;
  if (props.body.cursor) {
    // Cursor-based pagination
    const decodedCursor = Buffer.from(props.body.cursor, "base64").toString(
      "utf-8",
    );
    const [cursorId, cursorCreatedAt] = decodedCursor.split("|");
    cursor = {
      id: cursorId,
      created_at: new Date(cursorCreatedAt),
    };
  } else {
    // Offset-based pagination
    const page = props.body.page ?? 1;
    skip = (page - 1) * limit;
  }
  // Query moderators with ordering
  const records =
    await MyGlobal.prisma.reddit_clone_community_moderators.findMany({
      where: whereInput,
      ...(cursor ? { cursor, skip: 1 } : { skip }),
      take: limit,
      orderBy: [{ role: "asc" }, { created_at: "asc" }],
      ...RedditCloneCommunityModeratorAtSummaryTransformer.select(),
    });
  // Get total count for pagination
  const total = await MyGlobal.prisma.reddit_clone_community_moderators.count({
    where: whereInput,
  });
  // Build pagination info
  const currentPage = props.body.cursor ? 1 : (props.body.page ?? 1);
  const pagination = {
    current: currentPage,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return {
    pagination,
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