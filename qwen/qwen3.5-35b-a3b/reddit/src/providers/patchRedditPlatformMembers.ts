import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformMemberAtSummaryTransformer } from "../transformers/RedditPlatformMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformMembers(props: {
  body: IRedditPlatformMember.IRequest;
}): Promise<IPageIRedditPlatformMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  const whereInput: Prisma.reddit_platform_membersWhereInput = {
    deleted_at: null,
    ...(props.body.search_username !== undefined &&
      props.body.search_username !== "" && {
        username: {
          contains: props.body.search_username,
          mode: "insensitive",
        },
      }),
    ...(props.body.search_email !== undefined &&
      props.body.search_email !== "" && {
        email: {
          contains: props.body.search_email,
          mode: "insensitive",
        },
      }),
    ...(props.body.karma_min !== undefined &&
      props.body.karma_min !== undefined && {
        karma: {
          gte: props.body.karma_min,
        },
      }),
  } satisfies Prisma.reddit_platform_membersWhereInput;
  const orderByInput: Prisma.reddit_platform_membersOrderByWithRelationInput[] =
    props.body.sort_by === "username" ||
    props.body.sort_by === "created_at" ||
    props.body.sort_by === "karma"
      ? props.body.sort_by === "username"
        ? [
            {
              username: props.body.sort_order === "asc" ? "asc" : "desc",
            },
          ]
        : props.body.sort_by === "karma"
          ? [
              {
                karma: props.body.sort_order === "asc" ? "asc" : "desc",
              },
            ]
          : [
              {
                created_at: props.body.sort_order === "asc" ? "asc" : "desc",
              },
            ]
      : [{ created_at: "desc" }];
  const records = await MyGlobal.prisma.reddit_platform_members.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...RedditPlatformMemberAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.reddit_platform_members.count({
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
      RedditPlatformMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditPlatformMember.ISummary;
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
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// import { IPageIRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformMembers(props: {
//   body: IRedditPlatformMember.IRequest;
// }): Promise<IPageIRedditPlatformMember.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_members.findMany({
//     ...RedditPlatformMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------