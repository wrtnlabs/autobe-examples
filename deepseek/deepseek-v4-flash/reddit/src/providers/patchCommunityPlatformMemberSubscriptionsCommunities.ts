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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityPlatformMemberSubscriptionsCommunities(props: {
  member: MemberPayload;
  body: ICommunityPlatformSubscription.IRequest;
}): Promise<IPageICommunityPlatformCommunity.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const sort: string = props.body.sort ?? "name";
  const defaultDirection: "asc" | "desc" = sort === "name" ? "asc" : "desc";
  const actualDirection: "asc" | "desc" =
    props.body.direction === "asc"
      ? "asc"
      : props.body.direction === "desc"
        ? "desc"
        : defaultDirection;
  // Build the base where clause for community_platform_communities
  const whereInput: Prisma.community_platform_communitiesWhereInput = {
    deleted_at: null,
    communitySubscribers: {
      some: {
        member_id: props.member.id,
      },
    },
  };
  // Apply optional search filter on community name
  if (search !== undefined && search.length > 0) {
    whereInput.name = {
      contains: search,
      mode: "insensitive",
    };
  }
  // Handle subscription.created_at sort separately (requires querying subscriptions first)
  if (sort === "subscription.created_at") {
    // Step 1: Query subscriptions ordered by subscription date
    const subscriptions =
      await MyGlobal.prisma.community_platform_community_subscriptions.findMany(
        {
          where: {
            member_id: props.member.id,
          },
          orderBy: {
            created_at: actualDirection,
          },
          select: {
            community_id: true,
          },
        },
      );
    const total: number = subscriptions.length;
    const communityIds: string[] = subscriptions.map((s) => s.community_id);
    const paginatedIds: string[] = communityIds.slice(skip, skip + limit);
    // Step 2: Fetch communities with transformer select
    const communities =
      await MyGlobal.prisma.community_platform_communities.findMany({
        where: {
          id: {
            in: paginatedIds,
          },
          deleted_at: null,
        },
        ...CommunityPlatformCommunityAtSummaryTransformer.select(),
      });
    // Step 3: Preserve subscription order
    const communityMap: Map<string, (typeof communities)[0]> = new Map(
      communities.map((c) => [c.id, c]),
    );
    const ordered: typeof communities = [];
    for (const id of paginatedIds) {
      const community = communityMap.get(id);
      if (community !== undefined) {
        ordered.push(community);
      }
    }
    return {
      pagination: {
        current: page,
        limit: limit,
        records: total,
        pages: total === 0 ? 0 : Math.ceil(total / limit),
      },
      data: await ArrayUtil.asyncMap(
        ordered,
        CommunityPlatformCommunityAtSummaryTransformer.transform,
      ),
    };
  }
  // Build orderBy for non-subscription sorts
  let orderByInput: Prisma.community_platform_communitiesOrderByWithRelationInput;
  if (sort === "name") {
    orderByInput = { name: actualDirection };
  } else if (sort === "subscriber_count") {
    orderByInput = { subscriber_count: actualDirection };
  } else if (sort === "created_at") {
    orderByInput = { created_at: actualDirection };
  } else {
    // Fallback to name ascending for unknown sort values
    orderByInput = { name: "asc" };
  }
  // Execute queries sequentially (no Promise.all)
  const communities =
    await MyGlobal.prisma.community_platform_communities.findMany({
      where: whereInput,
      skip: skip,
      take: limit,
      orderBy: orderByInput,
      ...CommunityPlatformCommunityAtSummaryTransformer.select(),
    });
  const total: number =
    await MyGlobal.prisma.community_platform_communities.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      communities,
      CommunityPlatformCommunityAtSummaryTransformer.transform,
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
// import { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
// import { IPageICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunity";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
// import { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityPlatformMemberSubscriptionsCommunities(props: {
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