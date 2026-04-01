import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequest";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformRefundRequestTransformer } from "../transformers/MallPlatformRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putMallPlatformSellerRefundRequestsRefundRequestId(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IMallPlatformRefundRequest.IUpdate;
}): Promise<IMallPlatformRefundRequest> {
  const current =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        mall_platform_seller_id: true,
        mall_platform_administrator_id: true,
        reason: true,
        status: true,
        reviewed_at: true,
        review_note: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  if (current.mall_platform_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const nextStatus = props.body.status ?? current.status;
  const nextReviewedAt =
    props.body.reviewedAt !== undefined
      ? props.body.reviewedAt
      : (current.reviewed_at?.toISOString() ?? null);
  const nextReviewNote =
    props.body.reviewNote !== undefined
      ? props.body.reviewNote
      : (current.review_note ?? null);
  const nextAdministratorId =
    props.body.mallPlatformAdministratorId !== undefined
      ? props.body.mallPlatformAdministratorId
      : (current.mall_platform_administrator_id ?? null);
  const isTerminal =
    current.status === "approved" || current.status === "rejected";
  const isTransitioning = nextStatus !== current.status;
  if (isTerminal && isTransitioning) {
    throw new HttpException("Invalid refund request transition", 400);
  }
  if (current.status !== nextStatus && current.status !== "pending") {
    throw new HttpException("Invalid refund request transition", 400);
  }
  if (
    (nextStatus === "approved" || nextStatus === "rejected") &&
    nextReviewedAt === null
  ) {
    throw new HttpException("Invalid refund request transition", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.mall_platform_refund_request_snapshots.create({
      data: {
        id: v4(),
        mall_platform_refund_request_id: current.id,
        snapshot_reason: `refund request ${current.status} -> ${nextStatus}`,
        status_before: current.status,
        status_after: nextStatus,
        reviewer_role: props.seller.type,
        reviewer_note: nextReviewNote,
        created_at: new Date(),
      },
    });
    await prisma.mall_platform_refund_requests.update({
      where: { id: props.refundRequestId },
      data: {
        status: nextStatus,
        reviewed_at:
          nextStatus === "approved" || nextStatus === "rejected"
            ? new Date(nextReviewedAt ?? new Date().toISOString())
            : nextReviewedAt === null
              ? null
              : new Date(nextReviewedAt),
        review_note: nextReviewNote,
        mall_platform_administrator_id: nextAdministratorId,
        updated_at: new Date(),
      },
    });
  });
  const updated =
    await MyGlobal.prisma.mall_platform_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      ...MallPlatformRefundRequestTransformer.select(),
    });
  return await MallPlatformRefundRequestTransformer.transform(updated);
}
