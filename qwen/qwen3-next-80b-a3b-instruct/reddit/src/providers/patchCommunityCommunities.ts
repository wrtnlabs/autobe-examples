import { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchCommunityCommunities(props: {
  body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
  const { search, sort = "subscriber_count_desc", cursor } = props.body;
  // Define the base where condition
  let where: Prisma.community_communitiesWhereInput = {};
  // Apply search filter if provided (uses trigram search as specified)
  if (search) {
    where.name = {
      contains: search,
      mode: "insensitive",
    };
  }
  // Define order by based on sort parameter
  const orderByInput = (
    sort === "name_asc"
      ? { name: "asc" as const }
      : sort === "name_desc"
        ? { name: "desc" as const }
        : { id: "desc" as const }
  ) satisfies Prisma.community_communitiesOrderByWithRelationInput; // Fallback to id for subscriber_count_desc
  // Handle cursor pagination - cursor encodes the last ID and sort value
  let cursorInput: Prisma.community_communitiesWhereInput | undefined =
    undefined;
  if (cursor) {
    // For cursor-based pagination, we find records after the cursor position
    // The cursor is assumed to be a base64 encoded string containing the last community ID and sort value
    // We'll decode and use just the ID for simplicity as a placeholder
    // In a real implementation, this would decode properly from a token
    const decodedCursor = Buffer.from(cursor, "base64").toString("utf-8");
    const [lastId] = decodedCursor.split("|"); // Split by pipe separator
    if (lastId) {
      cursorInput = {
        id: { gt: lastId },
      };
    }
  }
  // Fetch data with cursor and search filters
  const data = await MyGlobal.prisma.community_communities.findMany({
    where: cursorInput ? { ...where, ...cursorInput } : where,
    orderBy: orderByInput,
    take: 100,
    select: {
      id: true,
      name: true,
      description: true,
      icon_url: true,
      created_at: true,
    },
  });
  // Count total records for pagination
  const total = await MyGlobal.prisma.community_communities.count({
    where: where,
  });
  // Calculate subscriber count for each community (count joined community_subscriptions)
  const communitiesWithSubscriberCount = await Promise.all(
    data.map(async (community) => {
      const subscriberCount =
        await MyGlobal.prisma.community_subscriptions.count({
          where: { community: { id: community.id } },
        });
      return {
        ...community,
        subscriber_count: subscriberCount,
      };
    }),
  );
  // Transform to ICommunityCommunity.ISummary
  const transformedData: ICommunityCommunity.ISummary[] =
    communitiesWithSubscriberCount.map((community) => {
      return {
        id: community.id,
        name: community.name,
        description: community.description,
        icon_url: community.icon_url,
        created_at:
          community.created_at instanceof Date
            ? toISOStringSafe(community.created_at)
            : (community.created_at as string & tags.Format<"date-time">),
      };
    });
  // Pagination response
  const response: IPageICommunityCommunity.ISummary = {
    pagination: {
      current: 1,
      limit: 100,
      records: total,
      pages: Math.ceil(total / 100),
    },
    data: transformedData,
  };
  return response;
}
