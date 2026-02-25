import { IDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardHealthCheck";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIDiscussionBoardHealthCheck } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardHealthCheck";
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

export async function patchDiscussionBoardAdministratorHealthChecks(props: {
  administrator: AdministratorPayload;
  body: IDiscussionBoardHealthCheck.IRequest;
}): Promise<IPageIDiscussionBoardHealthCheck.ISummary> {
  const { status, checkedAfter, checkedBefore, page, limit } = props.body;
  const currentPage = page ?? 1;
  const pageSize = limit ?? 20;
  if (currentPage < 1) {
    throw new HttpException("Page number must be at least 1", 400);
  }
  if (pageSize < 1 || pageSize > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const where: Prisma.discussion_board_health_checksWhereInput = {};
  if (status !== undefined && status !== null) {
    where.status = status;
  }
  const checkedAtFilter: Prisma.DateTimeFilter = {};
  if (checkedAfter !== undefined && checkedAfter !== null) {
    checkedAtFilter.gte = new Date(checkedAfter);
  }
  if (checkedBefore !== undefined && checkedBefore !== null) {
    checkedAtFilter.lte = new Date(checkedBefore);
  }
  if (Object.keys(checkedAtFilter).length > 0) {
    where.checked_at = checkedAtFilter;
  }
  // Cursor-based pagination
  // Calculate cursor offset
  const skipCount = (currentPage - 1) * pageSize;
  // Fetch data
  const items = await MyGlobal.prisma.discussion_board_health_checks.findMany({
    where,
    orderBy: [{ checked_at: "desc" }, { id: "desc" }],
    skip: skipCount,
    take: pageSize,
  });
  const totalCount = await MyGlobal.prisma.discussion_board_health_checks.count(
    { where },
  );
  // Transform data
  const data: IDiscussionBoardHealthCheck.ISummary[] = items.map((db) => ({
    id: db.id,
    status: db.status,
    checkedAt: db.checked_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
    details: db.details ?? null,
    createdAt: db.created_at.toISOString() as unknown as string &
      tags.Format<"date-time">,
  }));
  return {
    pagination: {
      current: currentPage,
      limit: pageSize,
      records: totalCount,
      pages: totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize),
    },
    data,
  };
}
