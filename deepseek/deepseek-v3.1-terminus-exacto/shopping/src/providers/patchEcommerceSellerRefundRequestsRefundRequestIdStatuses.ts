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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerRefundRequestsRefundRequestIdStatuses(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IEcommerceRefundRequest.IUpdateStatus;
}): Promise<IPageIEcommerceRefundRequestStatus.ISummary> {
  const refundRequest =
    await MyGlobal.prisma.ecommerce_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      include: {
        statusHistories: { orderBy: { created_at: "desc" } },
      },
    });
  if (!refundRequest) {
    throw new HttpException("Refund request not found", 404);
  }
  if (refundRequest.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Access denied", 403);
  }
  const newStatus =
    await MyGlobal.prisma.ecommerce_refund_request_statuses.create({
      data: {
        id: v4(),
        ecommerce_refund_request_id: props.refundRequestId,
        status: typia.assert<"pending" | "approved" | "rejected">(
          props.body.decision,
        ),
        reason: props.body.reason,
        created_at: new Date(),
      },
    });
  const statuses = [...refundRequest.statusHistories, newStatus];
  const data: IPageIEcommerceRefundRequestStatus.ISummary = {
    pagination: {
      pages: 1,
      limit: statuses.length,
      records: statuses.length,
      current: 1,
    } satisfies IPage.IPagination,
    data: statuses.map((status) => ({
      id: status.id,
      status: status.status,
      reason: status.reason,
      created_at: status.created_at.toISOString(),
    })),
  };
  return data;
}
