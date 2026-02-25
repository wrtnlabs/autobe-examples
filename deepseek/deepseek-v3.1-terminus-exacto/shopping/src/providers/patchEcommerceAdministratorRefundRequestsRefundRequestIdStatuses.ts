import { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import { IEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestStatus";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceRefundRequestStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestStatus";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceRefundRequestStatusAtSummaryTransformer } from "../transformers/EcommerceRefundRequestStatusAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdministratorRefundRequestsRefundRequestIdStatuses(props: {
  administrator: AdministratorPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdateStatus;
}): Promise<IPageIEcommerceRefundRequestStatus.ISummary> {
  // Validate decision is either 'approved' or 'rejected'
  if (
    props.body.decision !== "approved" &&
    props.body.decision !== "rejected"
  ) {
    throw new HttpException(
      "Decision must be either 'approved' or 'rejected'",
      400,
    );
  }
  // Validate reason is provided
  if (!props.body.reason || props.body.reason.trim().length === 0) {
    throw new HttpException("Reason is required for status update", 400);
  }
  // Verify refund request exists
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        ecommerce_seller_id: true,
        ecommerce_order_item_id: true,
        statusHistories: {
          orderBy: { created_at: "desc" },
          take: 1,
          select: { status: true },
        },
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  // Check if refund request is in a valid state for administrator intervention
  const currentStatus = refundRequest.statusHistories[0]?.status;
  if (currentStatus === "approved" || currentStatus === "rejected") {
    throw new HttpException("Refund request has already been processed", 400);
  }
  const now = new Date();
  // Create new status record
  const statusId = v4();
  await MyGlobal.prisma.ecommerce_refund_request_statuses.create({
    data: {
      id: statusId,
      ecommerce_refund_request_id: props.refundRequestId,
      status: props.body.decision,
      reason: props.body.reason,
      created_at: now,
    },
  });
  // Create refund response record with administrator as the responder
  await MyGlobal.prisma.ecommerce_refund_response_records.create({
    data: {
      id: v4(),
      ecommerce_refund_request_id: props.refundRequestId,
      ecommerce_seller_id: refundRequest.ecommerce_seller_id,
      decision: props.body.decision,
      response_reason: props.body.reason,
      responded_at: now,
      created_at: now,
      updated_at: now,
    },
  });
  // Update refund request timestamp
  await MyGlobal.prisma.ecommerce_refund_requests.update({
    where: { id: props.refundRequestId },
    data: { updated_at: now },
  });
  // Get paginated status history (all statuses including the new one)
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const statuses =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.findMany({
      where: { ecommerce_refund_request_id: props.refundRequestId },
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceRefundRequestStatusAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_refund_request_statuses.count({
    where: { ecommerce_refund_request_id: props.refundRequestId },
  });
  return {
    data: await ArrayUtil.asyncMap(
      statuses,
      EcommerceRefundRequestStatusAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
