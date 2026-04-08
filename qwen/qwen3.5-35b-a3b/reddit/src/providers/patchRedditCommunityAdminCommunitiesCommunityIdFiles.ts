import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityFile";
import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { RedditCommunityCommunityFileAtSummaryTransformer } from "../transformers/RedditCommunityCommunityFileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityAdminCommunitiesCommunityIdFiles(props: {
  admin: AdminPayload;
  communityId: string & tags.Format<"uuid">;
  body: IRedditCommunityCommunityFile.IRequest;
}): Promise<IPageIRedditCommunityCommunityFile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_community_community_filesWhereInput = {
    reddit_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      filename: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
  } satisfies Prisma.reddit_community_community_filesWhereInput;
  const orderByInput = (
    props.body.sortBy === "file_size"
      ? { file_size: props.body.sortOrder ?? "desc" }
      : props.body.sortBy === "filename"
        ? { filename: props.body.sortOrder ?? "desc" }
        : { created_at: props.body.sortOrder ?? "desc" }
  ) satisfies Prisma.reddit_community_community_filesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_community_community_files.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCommunityCommunityFileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_community_community_files.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityCommunityFileAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityCommunityFile.ISummary;
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
// import { IRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityFile";
// import { IPageIRedditCommunityCommunityFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunityFile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityAdminCommunitiesCommunityIdFiles(props: {
//   admin: AdminPayload;
//   communityId: string & tags.Format<"uuid">;
//   body: IRedditCommunityCommunityFile.IRequest;
// }): Promise<IPageIRedditCommunityCommunityFile.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_community_files.findMany({
//     ...RedditCommunityCommunityFileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityCommunityFileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------