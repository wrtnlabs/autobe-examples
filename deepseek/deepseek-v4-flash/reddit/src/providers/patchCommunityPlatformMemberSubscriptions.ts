import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { CommunityPlatformCommunityAtSummaryTransformer } from "../transformers/CommunityPlatformCommunityAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityPlatformMemberSubscriptions(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build community-level where clause (including soft-delete filter and search)
  const communityWhere: Prisma.community_platform_communitiesWhereInput = {
    deleted_at: null,
  };
  if (props.body.search?.length) {
    communityWhere.name = {
      contains: props.body.search,
      mode: "insensitive",
    } satisfies Prisma.StringFilter;
  }
  // Build subscription where clause filtered by authenticated member
  const subscriptionWhere: Prisma.community_platform_community_subscriptionsWhereInput =
    {
      member_id: props.member.id,
      community: communityWhere,
    } satisfies Prisma.community_platform_community_subscriptionsWhereInput;
  // Determine sort field — default to "name"
  const sort: string = props.body.sort ?? "name";
  // Compute direction: use provided value if valid, otherwise natural default
  const rawDirection: string | undefined = props.body.direction;
  const direction: "asc" | "desc" =
    rawDirection === "asc"
      ? ("asc" as "asc" | "desc")
      : rawDirection === "desc"
        ? ("desc" as "asc" | "desc")
        : sort === "name"
          ? ("asc" as "asc" | "desc")
          : ("desc" as "asc" | "desc");
  // Build orderBy — map sort keys to Prisma orderBy shapes
  const orderBy: Prisma.community_platform_community_subscriptionsOrderByWithRelationInput =
    (() => {
      if (sort === "name") {
        return { community: { name: direction } };
      }
      if (sort === "subscriber_count") {
        return { community: { subscriber_count: direction } };
      }
      if (sort === "created_at") {
        return { community: { created_at: direction } };
      }
      if (sort === "subscription.created_at") {
        return { created_at: direction };
      }
      return { community: { name: "asc" } };
    })();
  // Get total matching record count for pagination metadata
  const total =
    await MyGlobal.prisma.community_platform_community_subscriptions.count({
      where: subscriptionWhere,
    });
  // Get paginated subscriptions with full community data via transformer
  const subscriptions =
    await MyGlobal.prisma.community_platform_community_subscriptions.findMany({
      where: subscriptionWhere,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        community: CommunityPlatformCommunityAtSummaryTransformer.select(),
      } satisfies Prisma.community_platform_community_subscriptionsSelect,
    });
  // Transform each community record using the transformer
  const data = await ArrayUtil.asyncMap(subscriptions, (sub) =>
    CommunityPlatformCommunityAtSummaryTransformer.transform(sub.community),
  );
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageICommunityPlatformCommunity.ISummary;
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
// import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
// import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberSubscriptions(props: {
//   member: MemberPayload;
//   body: ICommunityPlatformSubscription.IRequest;
// }): Promise<IPageICommunityPlatformCommunity.ISummary> {
//   const records = await MyGlobal.prisma.community_platform_communities.findMany({
//     ...CommunityPlatformCommunityAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityPlatformCommunityAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------