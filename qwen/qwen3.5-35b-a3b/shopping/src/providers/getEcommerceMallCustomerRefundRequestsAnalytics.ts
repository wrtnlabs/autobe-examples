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
  const totalRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
      },
    });
  const pendingCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        status: "pending",
      },
    });
  const approvedCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        status: "approved",
      },
    });
  const rejectedCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        status: "rejected",
      },
    });
  const refundedCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        status: "refunded",
      },
    });
  const last7DaysCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      },
    });
  const last30DaysCount =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.count({
      where: {
        deleted_at: null,
        created_at: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    });
  const resolvedRequests =
    await MyGlobal.prisma.ecommerce_mall_refund_requests.findMany({
      where: {
        deleted_at: null,
        status: {
          in: ["approved", "rejected"],
        },
        decision_at: {
          not: null,
        },
        submitted_at: {
          not: null,
        },
      },
    });
  const averageProcessingTime:
    | (number & tags.Type<"int32"> & tags.Minimum<0>)
    | null =
    resolvedRequests.length > 0
      ? Math.round(
          resolvedRequests
            .map((r) => {
              if (r.decision_at === null || r.submitted_at === null) {
                return 0;
              }
              const diff = r.decision_at.getTime() - r.submitted_at.getTime();
              return diff / 1000;
            })
            .reduce((a, b) => a + b, 0) / resolvedRequests.length,
        )
      : null;
  const approvalRate: number & tags.Minimum<0> & tags.Maximum<100> =
    totalRequests > 0
      ? Math.round(((approvedCount + refundedCount) / totalRequests) * 100)
      : 0;
  const rejectionRate: number & tags.Minimum<0> & tags.Maximum<100> =
    totalRequests > 0 ? Math.round((rejectedCount / totalRequests) * 100) : 0;
  return {
    totalRequests: totalRequests as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    pendingCount: pendingCount as number & tags.Type<"int32"> & tags.Minimum<0>,
    approvedCount: approvedCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    rejectedCount: rejectedCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    refundedCount: refundedCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    last7DaysCount: last7DaysCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    last30DaysCount: last30DaysCount as number &
      tags.Type<"int32"> &
      tags.Minimum<0>,
    averageProcessingTime,
    approvalRate,
    rejectionRate,
  } satisfies IEcommerceMallRefundRequestAnalytic;
}
