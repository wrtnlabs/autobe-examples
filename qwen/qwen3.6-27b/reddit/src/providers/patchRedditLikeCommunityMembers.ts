import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityMember";
import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { REdditLikeCommunityMemberAtSummaryTransformer } from "../transformers/REdditLikeCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditLikeCommunityMembers(props: {
  body: IREdditLikeCommunityMember.IRequest;
}): Promise<IPageIRedditLikeCommunityMember.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    deleted_at: null,
    ...(body.username !== undefined && {
      username: { contains: body.username },
    }),
    ...(body.email !== undefined && { email: { contains: body.email } }),
    ...(body.created_at_from !== undefined || body.created_at_to !== undefined
      ? {
          created_at: {
            ...(body.created_at_from !== undefined && {
              gte: new Date(body.created_at_from),
            }),
            ...(body.created_at_to !== undefined && {
              lte: new Date(body.created_at_to),
            }),
          },
        }
      : {}),
    ...(body.updated_at_from !== undefined || body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(body.updated_at_from !== undefined && {
              gte: new Date(body.updated_at_from),
            }),
            ...(body.updated_at_to !== undefined && {
              lte: new Date(body.updated_at_to),
            }),
          },
        }
      : {}),
  } satisfies Prisma.reddit_like_community_membersWhereInput;
  const data = await MyGlobal.prisma.reddit_like_community_members.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...REdditLikeCommunityMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_like_community_members.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      REdditLikeCommunityMemberAtSummaryTransformer.transform,
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
// import { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
// import { IPageIRedditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditLikeCommunityMembers(props: {
//   body: IREdditLikeCommunityMember.IRequest;
// }): Promise<IPageIRedditLikeCommunityMember.ISummary> {
//   return {
//     pagination: ...,
//     data: await ArrayUtil.asyncMap(..., (r) => REdditLikeCommunityMemberAtSummaryTransformer.transform(r)),
//   };
// }
// ```
//--------------------------------------------------------------