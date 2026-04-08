import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostFile";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityPostFileAtSummaryTransformer } from "../transformers/RedditCommunityPostFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityPostsPostIdFiles(props: {
  postId: string & tags.Format<"uuid">;
  body: IRedditCommunityPostFile.IRequest;
}): Promise<IPageIRedditCommunityPostFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 25;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_post_filesWhereInput = {
    reddit_community_post_id: props.postId,
    ...(props.body.includeDeleted === true ? {} : { deleted_at: null }),
    ...(props.body.fileType !== undefined
      ? { file_type: props.body.fileType }
      : {}),
    ...(props.body.createdAfter !== undefined
      ? { created_at: { gt: props.body.createdAfter } }
      : {}),
    ...(props.body.createdBefore !== undefined
      ? { created_at: { lt: props.body.createdBefore } }
      : {}),
  } satisfies Prisma.reddit_community_post_filesWhereInput;
  const orderByInput = (
    props.body.sortBy === "file_size"
      ? { file_size: props.body.sortOrder === "asc" ? "asc" : "desc" }
      : props.body.sortBy === "file_name"
        ? { file_name: props.body.sortOrder === "asc" ? "asc" : "desc" }
        : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.reddit_community_post_filesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_community_post_files.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditCommunityPostFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_post_files.count({
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
      RedditCommunityPostFileAtSummaryTransformer.transform,
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
// import { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
// import { IPageIRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostFile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityPostsPostIdFiles(props: {
//   postId: string & tags.Format<"uuid">;
//   body: IRedditCommunityPostFile.IRequest;
// }): Promise<IPageIRedditCommunityPostFile.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_post_files.findMany({
//     ...RedditCommunityPostFileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityPostFileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------