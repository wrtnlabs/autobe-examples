import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCloneUserProfileAtSummaryTransformer } from "../transformers/RedditCloneUserProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCloneProfiles(props: {
  body: IRedditCloneUserProfile.IRequest;
}): Promise<IPageIRedditCloneUserProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.search && {
      display_name: {
        contains: props.body.search,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.created_after && {
      created_at: { gte: props.body.created_after },
    }),
    ...(props.body.created_before && {
      created_at: { lte: props.body.created_before },
    }),
  } satisfies Prisma.reddit_clone_user_profilesWhereInput;
  const orderByInput = (
    props.body.sort === "display_name"
      ? { display_name: props.body.order ?? "desc" }
      : { created_at: props.body.order ?? "desc" }
  ) satisfies Prisma.reddit_clone_user_profilesOrderByWithRelationInput;
  const records = await MyGlobal.prisma.reddit_clone_user_profiles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...RedditCloneUserProfileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_clone_user_profiles.count({
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
      RedditCloneUserProfileAtSummaryTransformer.transform,
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
// import { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
// import { IPageIRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneUserProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
// import { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
// import { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCloneProfiles(props: {
//   body: IRedditCloneUserProfile.IRequest;
// }): Promise<IPageIRedditCloneUserProfile.ISummary> {
//   const records = await MyGlobal.prisma.reddit_clone_user_profiles.findMany({
//     ...RedditCloneUserProfileAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCloneUserProfileAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------