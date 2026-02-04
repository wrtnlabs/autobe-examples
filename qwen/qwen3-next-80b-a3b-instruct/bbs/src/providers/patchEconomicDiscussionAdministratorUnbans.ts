import { IEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCitizen";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionCitizen } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCitizen";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEconomicDiscussionAdministratorUnbans(props: {
  administrator: AdministratorPayload;
  body: IEconomicDiscussionCitizen.IRequest;
}): Promise<IPageIEconomicDiscussionCitizen.ISummary> {
  const { username, unbannedAtRange, unbanningAdminId, cursor } = props.body;
  // Define base where conditions for economic_discussion_unbans
  const whereConditions: Record<string, unknown> = {};
  // Add username partial match filter (on citizen name)
  if (username) {
    whereConditions.citizen = { name: { contains: username } };
  }
  // Add unbanned_at range filter
  if (unbannedAtRange) {
    const unbannedAtFilter: Record<string, unknown> = {};
    if (unbannedAtRange.from) {
      unbannedAtFilter.gte = unbannedAtRange.from;
    }
    if (unbannedAtRange.to) {
      unbannedAtFilter.lte = unbannedAtRange.to;
    }
    if (Object.keys(unbannedAtFilter).length > 0) {
      whereConditions.created_at = unbannedAtFilter;
    }
  }
  // Add unbanning admin ID filter
  if (unbanningAdminId) {
    whereConditions.admin_id = unbanningAdminId;
  }
  // Validate cursor format if provided
  const cursorParam = cursor;
  const limit = 20; // Limit per page as specified
  // Determine cursor condition for pagination using composite key (created_at, id)
  let cursorWhereCondition:
    | Prisma.economic_discussion_unbansWhereInput
    | undefined;
  if (cursorParam) {
    try {
      // Decode cursor: "YYYY-MM-DDTHH:mm:ss.SSSZ|uuid"
      const [unbannedAtStr, idStr] = cursorParam.split("|");
      if (unbannedAtStr && idStr) {
        cursorWhereCondition = {
          OR: [
            { created_at: { gt: unbannedAtStr } },
            {
              created_at: { equals: unbannedAtStr },
              id: { gt: idStr },
            },
          ],
        };
      }
    } catch {
      // If cursor is malformed, ignore it and return first page
    }
  }
  // Construct final where condition
  const whereInput = {
    ...whereConditions,
    ...(cursorWhereCondition && cursorWhereCondition),
  } satisfies Prisma.economic_discussion_unbansWhereInput;
  // Query with pagination
  const unbans = await MyGlobal.prisma.economic_discussion_unbans.findMany({
    where: whereInput,
    take: limit + 1, // Fetch one extra to determine hasNext
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    include: {
      ban: {
        select: {
          reason: true,
          created_at: true,
        },
      },
      admin: { select: { name: true } }, // Fixed: Changed 'unbanningAdmin' to 'admin' based on schema
    },
  });
  // Extract total count
  const total = await MyGlobal.prisma.economic_discussion_unbans.count({
    where: whereConditions,
  });
  // Determine pagination state
  const hasNext = unbans.length > limit;
  const hasPrevious = !!cursorParam;
  // Trim result set if needed
  const data = hasNext ? unbans.slice(0, -1) : unbans;
  // Calculate next cursor
  let nextCursor: string | undefined;
  if (hasNext) {
    const lastItem = unbans[unbans.length - 2];
    nextCursor = `${lastItem.created_at}|${lastItem.id}`;
  }
  // Transform data to ISummary format as per IPageIEconomicDiscussionCitizen.ISummary interface
  const transformedData: IEconomicDiscussionCitizen.ISummary[] = data.map(
    (item) => ({
      id: item.ban_id,
    }),
  );
  // Return page structure as per IPageIEconomicDiscussionCitizen.ISummary
  return {
    data: transformedData,
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
