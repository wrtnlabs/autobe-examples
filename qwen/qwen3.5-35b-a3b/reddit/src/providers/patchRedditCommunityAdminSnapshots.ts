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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityPostSnapshotAtSummaryTransformer } from "../transformers/RedditCommunityPostSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminSnapshots(props: {
  admin: AdminPayload;
  body: IRedditCommunityPostSnapshot.IRequest;
}): Promise<IPageIRedditCommunityPostSnapshot.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 20;
  const sortBy: "created_at" | "id" | "status" =
    props.body.sortBy ?? "created_at";
  const sortOrder: "asc" | "desc" = props.body.sortOrder ?? "asc";
  if (page < 1 || limit < 1 || limit > 100) {
    throw new HttpException("Invalid pagination parameters", 400);
  }
  if (props.body.dateRange !== undefined) {
    if (props.body.dateRange.max <= props.body.dateRange.min) {
      throw new HttpException("Invalid date range: max must be after min", 400);
    }
  }
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_post_snapshotsWhereInput = {
    ...(props.body.dateRange !== undefined && {
      created_at: {
        gte: props.body.dateRange.min,
        lte: props.body.dateRange.max,
      },
    }),
    ...(props.body.postId !== undefined && {
      reddit_community_post_id: props.body.postId,
    }),
    ...(props.body.communityId !== undefined && {
      reddit_community_community_id: props.body.communityId,
    }),
    ...(props.body.memberId !== undefined && {
      reddit_community_member_id: props.body.memberId,
    }),
    ...(props.body.postType !== undefined && {
      post_type: props.body.postType,
    }),
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
  };
  const orderByInput: Prisma.reddit_community_post_snapshotsOrderByWithRelationInput[] =
    sortBy === "id"
      ? [{ id: sortOrder }]
      : sortBy === "status"
        ? [{ status: sortOrder }]
        : [{ created_at: sortOrder }, { id: "asc" }];
  const [records, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_post_snapshots.findMany({
      where: whereInput,
      orderBy: orderByInput,
      skip,
      take: limit,
      ...RedditCommunityPostSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.reddit_community_post_snapshots.count({
      where: whereInput,
    }),
  ]);
  const totalPages: number & tags.Type<"int32"> & tags.Minimum<0> = Math.ceil(
    total / limit,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      RedditCommunityPostSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityPostSnapshot.ISummary;
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
// export async function patchRedditCommunityAdminSnapshots(props: {
//   admin: AdminPayload;
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