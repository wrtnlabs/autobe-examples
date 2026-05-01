import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CommunityHubCommunitySubscriptionAtSummaryTransformer } from "../transformers/CommunityHubCommunitySubscriptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityHubCommunitiesCommunityNameSubscriptions(props: {
  communityName: string;
  body: ICommunityHubCommunitySubscription.IRequest;
}): Promise<IPageICommunityHubCommunitySubscription.ISummary> {
  const insensitiveMode: Prisma.QueryMode = "insensitive";
  const community = await MyGlobal.prisma.community_hub_communities.findFirst({
    where: {
      name: { equals: props.communityName, mode: insensitiveMode },
      deleted_at: null,
    },
    select: { id: true },
  } satisfies Prisma.community_hub_communitiesFindFirstArgs);
  if (community === null) {
    throw new HttpException("Community not found", 404);
  }
  const page =
    props.body.page !== undefined && props.body.page >= 1 ? props.body.page : 1;
  const rawLimit =
    props.body.limit !== undefined && props.body.limit >= 1
      ? props.body.limit
      : 20;
  const limit = rawLimit > 100 ? 100 : rawLimit;
  const skip = (page - 1) * limit;
  const search = props.body.search?.trim();
  const whereInput = {
    community_id: community.id,
    ...(props.body.member_id !== undefined
      ? { member_id: props.body.member_id }
      : {}),
    ...(search
      ? {
          member: {
            username: { contains: search, mode: insensitiveMode },
          },
        }
      : {}),
    ...(props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
      ? {
          created_at: {
            ...(props.body.created_at_from !== undefined
              ? { gte: props.body.created_at_from }
              : {}),
            ...(props.body.created_at_to !== undefined
              ? { lte: props.body.created_at_to }
              : {}),
          },
        }
      : {}),
    ...(props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
      ? {
          updated_at: {
            ...(props.body.updated_at_from !== undefined
              ? { gte: props.body.updated_at_from }
              : {}),
            ...(props.body.updated_at_to !== undefined
              ? { lte: props.body.updated_at_to }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.community_hub_community_subscriptionsWhereInput;
  const data =
    await MyGlobal.prisma.community_hub_community_subscriptions.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...CommunityHubCommunitySubscriptionAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.community_hub_community_subscriptions.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      CommunityHubCommunitySubscriptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageICommunityHubCommunitySubscription.ISummary;
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
// import { ICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunitySubscription";
// import { IPageICommunityHubCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubCommunitySubscription";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { ICommunityHubMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubMember";
// import { ICommunityHubCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubCommunity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchCommunityHubCommunitiesCommunityNameSubscriptions(props: {
//   communityName: string;
//   body: ICommunityHubCommunitySubscription.IRequest;
// }): Promise<IPageICommunityHubCommunitySubscription.ISummary> {
//   const records = await MyGlobal.prisma.community_hub_community_subscriptions.findMany({
//     ...CommunityHubCommunitySubscriptionAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, CommunityHubCommunitySubscriptionAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------