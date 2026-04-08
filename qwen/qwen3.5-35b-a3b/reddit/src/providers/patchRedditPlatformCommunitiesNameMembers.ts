import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityMember";
import { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { RedditPlatformCommunityMemberAtSummaryTransformer } from "../transformers/RedditPlatformCommunityMemberAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchRedditPlatformCommunitiesNameMembers(props: {
  name: string;
  body: IRedditPlatformCommunityMember.IRequest;
}): Promise<IPageIRedditPlatformCommunityMember.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const search: (string & tags.MinLength<1> & tags.MaxLength<50>) | undefined =
    props.body.search;
  const role: "owner" | "moderator" | "member" | undefined = props.body.role;
  const sort: "joined_at" | "role" | undefined = props.body.sort;
  const community =
    await MyGlobal.prisma.reddit_platform_communities.findUnique({
      where: { name: props.name },
      select: { id: true },
    });
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const where: Prisma.reddit_platform_community_membersWhereInput = {
    community_id: community.id,
    deleted_at: null,
  };
  if (role !== undefined) {
    where.role = role;
  }
  if (search !== undefined) {
    where.user = {
      username: {
        contains: search,
        mode: "insensitive",
      },
    };
  }
  const orderBy: Prisma.reddit_platform_community_membersOrderByWithRelationInput[] =
    sort === "role"
      ? [{ role: "asc" as const }]
      : [{ joined_at: "desc" as const }];
  const skip: number = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.reddit_platform_community_members.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...RedditPlatformCommunityMemberAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.reddit_platform_community_members.count({
      where,
    });
  const data: IRedditPlatformCommunityMember.ISummary[] =
    await ArrayUtil.asyncMap(
      records,
      RedditPlatformCommunityMemberAtSummaryTransformer.transform,
    );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIRedditPlatformCommunityMember.ISummary;
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
// import { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
// import { IPageIRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunityMember";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchRedditPlatformCommunitiesNameMembers(props: {
//   name: string;
//   body: IRedditPlatformCommunityMember.IRequest;
// }): Promise<IPageIRedditPlatformCommunityMember.ISummary> {
//   const records = await MyGlobal.prisma.reddit_platform_community_members.findMany({
//     ...RedditPlatformCommunityMemberAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, RedditPlatformCommunityMemberAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------