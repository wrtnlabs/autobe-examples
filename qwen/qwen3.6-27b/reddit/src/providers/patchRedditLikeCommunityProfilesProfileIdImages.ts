import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityProfileImage";
import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityProfileImageAtSummaryTransformer } from "../transformers/REdditLikeCommunityProfileImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityProfilesProfileIdImages(props: {
  profileId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityProfileImage.IRequest;
}): Promise<IPageIREdditLikeCommunityProfileImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const createdAtFilter = Object.fromEntries([
    ...(props.body.created_at_from !== undefined
      ? [["gte", props.body.created_at_from]]
      : []),
    ...(props.body.created_at_to !== undefined
      ? [["lte", props.body.created_at_to]]
      : []),
  ]);
  const whereClause = {
    reddit_like_community_profile_id: props.profileId,
    ...(props.body.is_active !== undefined && {
      is_active: props.body.is_active,
    }),
    ...(Object.keys(createdAtFilter).length > 0 && {
      created_at: createdAtFilter,
    }),
  } satisfies Prisma.reddit_like_community_profile_imagesWhereInput;
  const records =
    await MyGlobal.prisma.reddit_like_community_profile_images.findMany({
      ...REdditLikeCommunityProfileImageAtSummaryTransformer.select(),
      where: whereClause,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
  const total =
    await MyGlobal.prisma.reddit_like_community_profile_images.count({
      where: whereClause,
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
      REdditLikeCommunityProfileImageAtSummaryTransformer.transform,
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
// import { IREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfileImage";
// import { IPageIREdditLikeCommunityProfileImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIREdditLikeCommunityProfileImage";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityProfilesProfileIdImages(props: {
//   profileId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityProfileImage.IRequest;
// }): Promise<IPageIREdditLikeCommunityProfileImage.ISummary> {
//   const records = await MyGlobal.prisma.reddit_like_community_profile_images.findMany({
//     ...REdditLikeCommunityProfileImageAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, REdditLikeCommunityProfileImageAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------