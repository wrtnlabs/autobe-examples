import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditCommunityMemberAtSummaryTransformer } from "../transformers/RedditCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditCommunityMembers(props: {
  body: IRedditCommunityMember.IRequest;
}): Promise<IPageIRedditCommunityMember.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereClause: Prisma.reddit_community_membersWhereInput = {
    ...(props.body.username !== undefined && {
      username: {
        contains: props.body.username,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.email !== undefined && {
      email: {
        contains: props.body.email,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.status !== undefined &&
      props.body.status === "deleted" && {
        deleted_at: { not: null },
      }),
    ...(props.body.status !== undefined &&
      props.body.status === "active" && {
        deleted_at: null,
      }),
    ...(props.body.created_at_range !== undefined && {
      created_at: {
        gte: props.body.created_at_range.start,
        lte: props.body.created_at_range.end,
      },
    }),
    ...(props.body.updated_at_range !== undefined && {
      updated_at: {
        gte: props.body.updated_at_range.start,
        lte: props.body.updated_at_range.end,
      },
    }),
  } satisfies Prisma.reddit_community_membersWhereInput;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.reddit_community_members.findMany({
      where: whereClause,
      skip,
      take: limit,
      ...RedditCommunityMemberAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" },
    }),
    MyGlobal.prisma.reddit_community_members.count({ where: whereClause }),
  ]);
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      RedditCommunityMemberAtSummaryTransformer.transform,
    ),
  } satisfies IPageIRedditCommunityMember.ISummary;
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
// import { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
// import { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditCommunityMembers(props: {
//   body: IRedditCommunityMember.IRequest;
// }): Promise<IPageIRedditCommunityMember.ISummary> {
//   const records = await MyGlobal.prisma.reddit_community_members.findMany({
//     ...RedditCommunityMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditCommunityMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------