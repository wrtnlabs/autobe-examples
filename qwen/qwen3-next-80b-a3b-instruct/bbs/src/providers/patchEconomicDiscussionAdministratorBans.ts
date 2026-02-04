import { IEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEconomicDiscussionBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionBan";
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

export async function patchEconomicDiscussionAdministratorBans(props: {
  administrator: AdministratorPayload;
  body: IEconomicDiscussionBan.IRequest;
}): Promise<IPageIEconomicDiscussionBan.ISummary> {
  // Use cursor for pagination as defined in IEconomicDiscussionBan.IRequest, not page
  const cursor = body.cursor || null;
  const limit = body.limit || 20;
  // Prepare search filters
  const whereInput: Prisma.economic_discussion_bansWhereInput = {};
  // Apply username filter if provided - join with citizen table by citizen_id
  if (body.username) {
    // We need to join with economic_discussion_citizens to filter by name
    // We'll handle this in a separate query or with a custom SQL
    // Since we can't use relation objects in where, we must use a different approach
    // Get the citizen_ids of users with matching names
    const matchingCitizens =
      await MyGlobal.prisma.economic_discussion_citizens.findMany({
        where: { name: { contains: body.username, mode: "insensitive" } },
        select: { id: true },
      });
    if (matchingCitizens.length > 0) {
      whereInput.citizen_id = { in: matchingCitizens.map((c) => c.id) };
    }
  }
  // Apply reason filter if provided - reason is direct field in ban table
  if (body.reason) {
    whereInput.reason = { contains: body.reason, mode: "insensitive" };
  }
  // Apply date range filters if provided - use created_at field for filtering
  if (body.startDate || body.endDate) {
    whereInput.created_at = {};
    if (body.startDate) {
      whereInput.created_at.gte = body.startDate;
    }
    if (body.endDate) {
      whereInput.created_at.lte = body.endDate;
    }
  }
  // Apply cursor-based pagination if provided
  // Cursor should be the created_at timestamp of last item
  // We'll use created_at for ordering and cursor tracking
  const orderBy: Prisma.economic_discussion_bansOrderByWithRelationInput = {
    created_at: "desc",
  };
  // Query for data with transformable fields
  // Only select the fields that exist in economic_discussion_bans
  const data = await MyGlobal.prisma.economic_discussion_bans.findMany({
    where: whereInput,
    take: limit,
    cursor: cursor ? { created_at: cursor } : undefined,
    orderBy: orderBy,
    select: {
      created_at: true,
      reason: true,
      citizen_id: true,
      admin_id: true,
    },
  });
  // Transform to expected response format
  const transformedData: IEconomicDiscussionBan.ISummary[] = data.map(
    (ban) => ({
      banned_user_id: ban.citizen_id,
      banned_by_admin_id: ban.admin_id,
      reason: ban.reason,
      banned_at: toISOStringSafe(ban.created_at), // Use created_at as banned_at per IEconomicDiscussionBan.ISummary
      created_at: toISOStringSafe(ban.created_at),
    }),
  );
  // Count total records
  const total = await MyGlobal.prisma.economic_discussion_bans.count({
    where: whereInput,
  });
  // Extract cursor for next page
  const nextCursor =
    data.length > 0
      ? toISOStringSafe(data[data.length - 1].created_at)
      : undefined;
  // Return paginated response
  return {
    data: transformedData,
    pagination: {
      current: cursor ? 1 : 1, // For cursor-based pagination, current is not typically tracked in the same way
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
      next: nextCursor,
    },
  };
}
