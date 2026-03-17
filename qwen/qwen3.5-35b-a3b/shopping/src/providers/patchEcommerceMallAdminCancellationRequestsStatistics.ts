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
  const startDate = props.body.start_date
    ? new Date(props.body.start_date + "T00:00:00.000Z")
    : undefined;
  const endDate = props.body.end_date
    ? new Date(props.body.end_date + "T23:59:59.999Z")
    : undefined;
  const whereClause: Prisma.ecommerce_mall_cancellation_requestsWhereInput = {
    deleted_at: null,
    ...(startDate && { created_at: { gte: startDate } }),
    ...(endDate && { created_at: { lte: endDate } }),
  };
  const totalCount =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: whereClause,
    });
  const [pendingCount, approvedCount, rejectedCount] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: { ...whereClause, status: "pending" },
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: { ...whereClause, status: "approved" },
    }),
    MyGlobal.prisma.ecommerce_mall_cancellation_requests.count({
      where: { ...whereClause, status: "rejected" },
    }),
  ]);
  const processedCount = approvedCount + rejectedCount;
  const approvalRate =
    processedCount > 0 ? approvedCount / processedCount : null;
  const processedRequests =
    await MyGlobal.prisma.ecommerce_mall_cancellation_requests.findMany({
      where: {
        ...whereClause,
        status: { in: ["approved", "rejected"] },
      },
      select: { created_at: true, updated_at: true },
    });
  const averageProcessingTime =
    processedCount > 0
      ? processedRequests.reduce(
          (sum, req) =>
            sum +
            (req.updated_at.getTime() - req.created_at.getTime()) / 3600000,
          0,
        ) / processedCount
      : null;
  return {
    total_count: totalCount,
    by_status: {
      pending_count: pendingCount,
      approved_count: approvedCount,
      rejected_count: rejectedCount,
    },
    approval_rate: approvalRate,
    average_processing_time: averageProcessingTime,
    processing_time_unit: "hours",
  };
}
