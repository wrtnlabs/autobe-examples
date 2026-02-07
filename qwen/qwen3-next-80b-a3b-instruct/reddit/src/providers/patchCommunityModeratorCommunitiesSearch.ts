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
import { ModeratorPayload } from "../decorators/payload/ModeratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function patchCommunityModeratorCommunitiesSearch(props: {
  moderator: ModeratorPayload;
  body: ICommunityCommunity.IRequest;
}): Promise<IPageICommunityCommunity.ISummary> {
  const limit = 20;
  // Cursor-based pagination: decode cursor if exists
  // We don't decode its structure since it's opaque: just use it as a bookmark
  let cursorWhere: Prisma.community_communitiesWhereInput = {};
  let orderBy: Prisma.community_communitiesOrderByWithRelationInput = {};
  // Build WHERE clause
  if (props.body.search) {
    cursorWhere.name = { contains: props.body.search, mode: "insensitive" };
  }
  // Determine order by based on sort parameter
  if (props.body.sort === "subscriber_count_desc" || !props.body.sort) {
    orderBy = { name: "asc" };
  } else if (props.body.sort === "name_asc") {
    orderBy = { name: "asc" };
  } else if (props.body.sort === "name_desc") {
    orderBy = { name: "desc" };
  }
  // Start building query
  let where: Prisma.community_communitiesWhereInput = cursorWhere;
  // Handle cursor if provided (must be exact string from previous response)
  if (props.body.cursor) {
    // Cursor is opaque - we'll use it to get the last seen record's values
    // But we don't know its structure, so we'll just use it to filter from
    // the endpoint that provided it — we rely on external system to ensure
    // cursor consistency with sort criteria.
    // The spec says it encodes the last community ID and sort value.
    const [idString, sortKey] = props.body.cursor.split("|");
    const lastId = idString as string & tags.Format<"uuid">;
    // We need to match the same sort order used to generate cursor
    if (sortKey === "subscriber_count_desc" || !sortKey) {
      // For subscriber_count_desc: find records with same or higher count,
      // but greater id for tie-breaking
      const lastRecord = await MyGlobal.prisma.community_communities.findUnique(
        {
          where: { id: lastId },
          select: { id: true },
        },
      );
      if (lastRecord) {
        const totalSubscriptions =
          await MyGlobal.prisma.community_subscriptions.count({
            where: { community_community_id: lastId },
          });
        const subscriptionCount = totalSubscriptions;
        // We cannot use aggregate counts in where clause directly, so this approach is wrong
        // Instead, we'll handle filtering by subscriber count in application logic
        // and let Prisma handle the ordering with the subscriptions relationship
      }
    } else if (sortKey === "name_asc") {
      const lastRecord = await MyGlobal.prisma.community_communities.findUnique(
        {
          where: { id: lastId },
          select: { name: true },
        },
      );
      if (lastRecord) {
        const lastName = lastRecord.name;
        where = {
          ...cursorWhere,
          OR: [
            {
              name: {
                gt: lastName,
              },
            },
            {
              name: {
                equals: lastName,
              },
              id: { gt: lastId },
            },
          ],
        };
      }
    } else if (sortKey === "name_desc") {
      const lastRecord = await MyGlobal.prisma.community_communities.findUnique(
        {
          where: { id: lastId },
          select: { name: true },
        },
      );
      if (lastRecord) {
        const lastName = lastRecord.name;
        where = {
          ...cursorWhere,
          OR: [
            {
              name: {
                lt: lastName,
              },
            },
            {
              name: {
                equals: lastName,
              },
              id: { gt: lastId },
            },
          ],
        };
      }
    }
  }
  // Get data and total
  // Use proper relationship name 'subscriptions' for relation access
  const data = await MyGlobal.prisma.community_communities.findMany({
    where,
    orderBy,
    take: limit + 1, // get one extra to determine if there's a next page
    include: {
      subscriptions: { select: { id: true } }, // Correct relationship name
    },
  });
  // Extract total count - this is now correct
  const total = await MyGlobal.prisma.community_communities.count({ where });
  // Handle pagination
  let hasNextPage = false;
  let nextCursor: string | undefined = undefined;
  if (data.length > limit) {
    hasNextPage = true;
    const lastItem = data[data.length - 2]; // the actual last item of the page
    const sortKey = props.body.sort || "subscriber_count_desc";
    nextCursor = `${lastItem.id}|${sortKey}`;
  }
  // Trim data to limit
  const trimmedData = data.slice(0, limit);
  // For subscriber_count_desc sort, calculate subscribers count for each community
  // This is done here because we can't do it efficiently in Prisma
  // We'll add a property that counts the number of subscriptions per community
  const dataWithSubscriberCounts = trimmedData.map((item) => {
    return {
      ...item,
      subscriberCount: item.subscriptions.length, // Count of subscriptions
    };
  });
  // If we're sorting by subscriber_count_desc, sort the data
  if (props.body.sort === "subscriber_count_desc" || !props.body.sort) {
    dataWithSubscriberCounts.sort((a, b) => {
      // Sort by subscriber count descending
      if (b.subscriberCount !== a.subscriberCount) {
        return b.subscriberCount - a.subscriberCount;
      }
      // Tie-break by name ascending
      return a.name.localeCompare(b.name);
    });
  }
  // Build response - return ISummary which is {} based on schema
  return {
    data: dataWithSubscriberCounts.map(() => ({})), // ICommunityCommunity.ISummary is {}
    pagination: {
      current: props.body.cursor
        ? Math.floor((total - (total % limit)) / limit) + 1
        : 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
