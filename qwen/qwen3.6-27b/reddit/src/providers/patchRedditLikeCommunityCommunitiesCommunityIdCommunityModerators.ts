import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityCommunityModeratorAtSummaryTransformer } from "../transformers/REdditLikeCommunityCommunityModeratorAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityCommunitiesCommunityIdCommunityModerators(props: {
  communityId: string & tags.Format<"uuid">;
  body: IREdditLikeCommunityCommunityModerator.IRequest;
}): Promise<IPageIRedditLikeCommunityCommunityModerator.ISummary> {
  const baseWhere: Prisma.reddit_like_community_community_moderatorsWhereInput =
    {
      community: { id: props.communityId },
      deleted_at: null,
      ...(props.body.role !== undefined && { role: props.body.role }),
    };
  const searchClause =
    props.body.search !== undefined
      ? {
          OR: [
            { member: { username: { contains: props.body.search } } },
            { member: { email: { contains: props.body.search } } },
          ],
        }
      : {};
  const where: Prisma.reddit_like_community_community_moderatorsWhereInput = {
    ...baseWhere,
    ...searchClause,
  };
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const data =
    await MyGlobal.prisma.reddit_like_community_community_moderators.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...REdditLikeCommunityCommunityModeratorAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.reddit_like_community_community_moderators.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform,
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
// import { IREdditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunityModerator";
// import { IPageIRedditLikeCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityCommunityModerator";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityCommunitiesCommunityIdCommunityModerators(props: {
//   communityId: string & tags.Format<"uuid">;
//   body: IREdditLikeCommunityCommunityModerator.IRequest;
// }): Promise<IPageIRedditLikeCommunityCommunityModerator.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityCommunityModeratorAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------