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
  const { body } = props;
  // Since properties like page, limit, status, checked_at_start, checked_at_end, details do not exist on IDiscussionBoardHealthCheck.IRequest according to errors,
  // we won't use them for filtering or pagination.
  // Default pagination values
  const page = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limit = 20 as number & tags.Type<"int32"> & tags.Minimum<0>;
  // Build where clause with only deleted_at filter
  const where: Prisma.discussion_board_health_checksWhereInput = {
    deleted_at: null,
  };
  // Query database
  const healthChecks =
    await MyGlobal.prisma.discussion_board_health_checks.findMany({
      where,
      skip: 0,
      take: 20,
      orderBy: { checked_at: "desc" },
    });
  const total = await MyGlobal.prisma.discussion_board_health_checks.count({
    where,
  });
  // Transform result set, convert Date to string using toISOStringSafe
  const data = healthChecks.map((record) => ({
    id: record.id,
    status: record.status,
    checked_at: toISOStringSafe(record.checked_at),
    details: record.details === null ? null : record.details,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  }));
  const pagination = {
    current: page,
    limit: limit,
    records: total,
    pages: Math.ceil(total / limit),
  } satisfies IPage.IPagination;
  return { pagination, data };
}
