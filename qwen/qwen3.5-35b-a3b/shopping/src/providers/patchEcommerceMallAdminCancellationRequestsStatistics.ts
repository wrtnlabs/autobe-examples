import { IEcommerceMallCancellationRequestStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestStatistic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCancellationRequestsStatistics(props: {
  admin: AdminPayload;
  body: IEcommerceMallCancellationRequestStatistic.IRequest;
}): Promise<IEcommerceMallCancellationRequestStatistic> {
  const start_date = props.body.start_date;
  const end_date = props.body.end_date;
  const group_by = props.body.group_by ?? "status";
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereClauses: string[] = ["deleted_at IS NULL"];
  const whereValues: unknown[] = [];
  if (start_date !== undefined && start_date !== null) {
    whereClauses.push("created_at >= ${start_date}");
    whereValues.push(start_date + "T00:00:00Z");
  }
  if (end_date !== undefined && end_date !== null) {
    whereClauses.push("created_at <= ${end_date}");
    whereValues.push(end_date + "T23:59:59Z");
  }
  const whereClause = whereClauses.join(" AND ");
  const params = Prisma.sql`
    WHERE ${Prisma.raw(whereClause)}
  `;
  const stats = await MyGlobal.prisma.$queryRaw<
    Array<{
      total_count: number;
      pending_count: number;
      approved_count: number;
      rejected_count: number;
      approval_rate: number | null;
      average_processing_time: number | null;
    }>
  >(Prisma.sql`
    SELECT
      COUNT(*)::int AS total_count,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END)::int AS pending_count,
      SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::int AS approved_count,
      SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END)::int AS rejected_count,
      CASE
        WHEN (SUM(CASE WHEN status IN ('approved', 'rejected') THEN 1 ELSE 0 END)) = 0 THEN NULL
        ELSE (SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END)::float / NULLIF(SUM(CASE WHEN status IN ('approved', 'rejected') THEN 1 ELSE 0 END), 0))
      END AS approval_rate,
      AVG(
        CASE
          WHEN status IN ('approved', 'rejected') THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
          ELSE NULL
        END
      ) AS average_processing_time
    FROM ecommerce_mall_cancellation_requests
    ${params}
  `);
  const row = stats[0];
  return {
    total_count: row.total_count,
    by_status: {
      pending_count: row.pending_count,
      approved_count: row.approved_count,
      rejected_count: row.rejected_count,
    } satisfies IEcommerceMallCancellationRequestStatistic.IByStatus,
    approval_rate: row.approval_rate,
    average_processing_time: row.average_processing_time,
    processing_time_unit: "hours",
  } satisfies IEcommerceMallCancellationRequestStatistic;
}
