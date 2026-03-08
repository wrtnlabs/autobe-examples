import { IDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { DiscussionBoardAdministratorRequestAtSummaryTransformer } from "../transformers/DiscussionBoardAdministratorRequestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchDiscussionBoardAdminAdminRequests(props: {
  admin: AdminPayload;
  body: IDiscussionBoardAdministratorRequest.IRequest;
}): Promise<IPageIDiscussionBoardAdministratorRequest.ISummary> {
  // Authorization check: only super administrators can access this endpoint
  if (props.admin.type !== "admin") {
    throw new HttpException("Forbidden", 403);
  }
  // Parse pagination parameters
  const limit = props.body.limit ?? 20;
  const cursor = props.body.cursor ?? null;
  // Build where clause - filter by status if provided
  const whereClause: Prisma.discussion_board_administrator_requestsWhereInput =
    {
      status: props.body.status || "pending",
    };
  // Build order by clause
  const orderByClause: Prisma.discussion_board_administrator_requestsOrderByWithRelationInput =
    {
      submitted_at: props.body.sortOrder === "asc" ? "asc" : "desc",
    };
  // Build cursor for pagination (use submitted_at timestamp as cursor)
  const whereWithCursor = cursor
    ? {
        ...whereClause,
        submitted_at:
          props.body.sortOrder === "asc"
            ? { gt: new Date(cursor) }
            : { lt: new Date(cursor) },
      }
    : whereClause;
  // Fetch records with select for all necessary fields
  const records =
    await MyGlobal.prisma.discussion_board_administrator_requests.findMany({
      where: whereWithCursor,
      orderBy: orderByClause,
      take: limit + 1, // Fetch one extra to determine if there's a next page
      ...DiscussionBoardAdministratorRequestAtSummaryTransformer.select(),
    });
  // Extract next cursor if exists
  const hasMore = records.length > limit;
  const data = hasMore ? records.slice(0, limit) : records;
  const nextCursor = hasMore ? data[data.length - 1].submitted_at : null;
  // Transform records to summary format
  const summaryData = await Promise.all(
    data.map((record) =>
      DiscussionBoardAdministratorRequestAtSummaryTransformer.transform(record),
    ),
  );
  // Fetch total count for accurate pagination
  const total =
    await MyGlobal.prisma.discussion_board_administrator_requests.count({
      where: whereClause,
    });
  // Calculate pagination metadata
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    data: summaryData,
    pagination: {
      current: 1,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
