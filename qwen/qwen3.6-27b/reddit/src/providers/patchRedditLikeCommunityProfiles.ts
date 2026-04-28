import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityProfile";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityProfileAtSummaryTransformer } from "../transformers/REdditLikeCommunityProfileAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityProfiles(props: {
  body: IREdditLikeCommunityProfile.IRequest;
}): Promise<IPageIRedditLikeCommunityProfile.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(props.body.search && {
      display_name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.min_karma !== undefined && {
      karma: { gte: props.body.min_karma },
    }),
    ...(props.body.max_karma !== undefined && {
      karma: { lte: props.body.max_karma },
    }),
  } satisfies Prisma.reddit_like_community_profilesWhereInput;
  const sortField = props.body.sort_by ?? "created_at";
  const orderDir =
    props.body.order ?? (sortField === "display_name" ? "asc" : "desc");
  const orderByInput = (
    sortField === "karma"
      ? { karma: orderDir === "asc" ? "asc" : "desc" }
      : sortField === "display_name"
        ? { display_name: orderDir === "asc" ? "asc" : "desc" }
        : { created_at: orderDir === "asc" ? "asc" : "desc" }
  ) satisfies Prisma.reddit_like_community_profilesOrderByWithRelationInput;
  const data = await MyGlobal.prisma.reddit_like_community_profiles.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...REdditLikeCommunityProfileAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_community_profiles.count({
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
      REdditLikeCommunityProfileAtSummaryTransformer.transform,
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
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// import { IPageIRedditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityProfile";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityProfiles(props: {
//   body: IREdditLikeCommunityProfile.IRequest;
// }): Promise<IPageIRedditLikeCommunityProfile.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityProfileAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------