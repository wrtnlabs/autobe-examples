import { IEcommerceMallRefundRequestAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerRefundRequestsAnalytics(props: {
  customer: CustomerPayload;
}): Promise<IEcommerceMallRefundRequestAnalytic> {
  const allRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: { deleted_at: null },
    });
  const totalRequests = allRequests.length;
  const approvedCount = allRequests.filter(
    (r) => r.status === "approved",
  ).length;
  const rejectedCount = allRequests.filter(
    (r) => r.status === "rejected",
  ).length;
  const refundedCount = allRequests.filter(
    (r) => r.status === "refunded",
  ).length;
  const pendingCount = allRequests.filter((r) => r.status === "pending").length;
  const approvalRate =
    totalRequests > 0
      ? ((approvedCount + refundedCount) / totalRequests) * 100
      : 0;
  const rejectionRate =
    totalRequests > 0 ? (rejectedCount / totalRequests) * 100 : 0;
  const resolvedRequests = allRequests.filter(
    (r) => r.status === "approved" || r.status === "rejected",
  );
  let averageProcessingTime: number | null = null;
  if (resolvedRequests.length > 0) {
    const totalProcessingTime = resolvedRequests.reduce((sum, r) => {
      if (r.submitted_at && r.decision_at) {
        const diffMs = r.decision_at.getTime() - r.submitted_at.getTime();
        return sum + diffMs / 1000;
      }
      return sum;
    }, 0);
    averageProcessingTime = Math.round(
      totalProcessingTime / resolvedRequests.length,
    );
  }
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const last7DaysCount = allRequests.filter((r) => {
    return r.created_at && r.created_at >= last7Days;
  }).length;
  const last30DaysCount = allRequests.filter((r) => {
    return r.created_at && r.created_at >= last30Days;
  }).length;
  return {
    totalRequests,
    approvedCount,
    rejectedCount,
    refundedCount,
    pendingCount,
    approvalRate,
    rejectionRate,
    last7DaysCount,
    last30DaysCount,
    averageProcessingTime,
  };
}
