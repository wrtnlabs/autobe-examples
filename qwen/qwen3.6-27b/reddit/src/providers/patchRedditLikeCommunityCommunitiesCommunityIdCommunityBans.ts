import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityBan";
import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityCommunityBanAtSummaryTransformer } from "../transformers/REdditLikeCommunityCommunityBanAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommunitiesCommunityIdCommunityBans(props: {
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunityBan.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunityBan.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where: Prisma.reddit_like_community_community_bansWhereInput = {
    reddit_like_community_community_id: props.communityId,
    deleted_at: null,
    ...(props.body.created_after !== undefined && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before !== undefined && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
    ...(props.body.search !== undefined && {
      reason: { contains: props.body.search, mode: "insensitive" as const },
    }),
  };
  const orderBy: Prisma.reddit_like_community_community_bansOrderByWithRelationInput =
    {
      created_at: (props.body.sort ?? "desc") as Prisma.SortOrder,
    };
  const data =
    await MyGlobal.prisma.reddit_like_community_community_bans.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...REdditLikeCommunityCommunityBanAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_like_community_community_bans.count({ where });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityCommunityBanAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
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
// import { IREdditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityBan";
// import { IPageIRedditLikeCommunityCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityBan";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommunitiesCommunityIdCommunityBans(props: {
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunityBan.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunityBan.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityCommunityBanAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------