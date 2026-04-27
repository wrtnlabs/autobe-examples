import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityPlatformCommunitySubscriptionAtSummaryTransformer } from "../transformers/CommunityPlatformCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformCommunitiesCommunityNameSubscribers(props: {
  communityName: string;
  body: ICommunityPlatformCommunitySubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
  // 1. Lookup community by name — reject 404 if not found or soft-deleted
  const community =
    await MyGlobal.prisma.community_platform_communities.findUniqueOrThrow({
      where: { name: props.communityName },
      select: { id: true, deleted_at: true },
    });
  if (community.deleted_at !== null) {
    throw new HttpException("Community not found", 404);
  }
  // 2. Parse pagination
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const skip = (page - 1) * limit;
  // 3. Parse sort direction
  const sortDirection: "asc" | "desc" =
    props.body.sort === "asc" ? "asc" : "desc";
  // 4. Build where filter
  const whereFilter = {
    community_id: community.id,
    member: {
      deleted_at: null,
    },
  } satisfies Prisma.community_platform_community_subscriptionsWhereInput;
  // 5. Query paginated subscription records
  const records =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      ...CommunityPlatformCommunitySubscriptionAtSummaryTransformer.select(),
      where: whereFilter,
      skip,
      take: limit,
      orderBy: {
        created_at: sortDirection,
      },
    });
  // 6. Count total matching records
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: whereFilter,
    });
  // 7. Compute total pages
  const pages = Math.ceil(total / limit);
  // 8. Transform records and return paginated response
  return {
    data: await ArrayUtil.asyncMap(
      records,
      CommunityPlatformCommunitySubscriptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
  } satisfies IPageICommunityPlatformCommunitySubscription.ISummary;
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
// import { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
// import { IPageICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformCommunitiesCommunityNameSubscribers(props: {
//   communityName: string;
//   body: ICommunityPlatformCommunitySubscription.IRequest;
// }): Promise<IPageICommunityPlatformCommunitySubscription.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
//     ...CommunityPlatformCommunitySubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunitySubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------