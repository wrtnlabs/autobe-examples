import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdSnapshots(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_community_post_snapshotsWhereInput = {
    reddit_community_post_id: props.postId,
  };
  if (props.body.communityId !== undefined) {
    where.reddit_community_community_id = props.body.communityId;
  }
  if (props.body.memberId !== undefined) {
    where.reddit_community_member_id = props.body.memberId;
  }
  if (props.body.postType !== undefined) {
    where.post_type = props.body.postType;
  }
  if (props.body.status !== undefined) {
    where.status = props.body.status;
  }
  if (props.body.dateRange !== undefined) {
    where.created_at = {
      gte: props.body.dateRange.min,
      lte: props.body.dateRange.max,
    };
  }
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const orderBy = {
    [sortBy]: sortOrder,
  } satisfies Prisma.reddit_community_post_snapshotsOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.reddit_community_post_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.reddit_community_post_snapshots.count({
    where,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityPostSnapshotAtSummaryTransformer.transform,
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
// import { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
// import { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityPostsPostIdSnapshots(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityPostSnapshot.IRequest;
// }): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_post_snapshots.findMany({
//     ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityPostSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------