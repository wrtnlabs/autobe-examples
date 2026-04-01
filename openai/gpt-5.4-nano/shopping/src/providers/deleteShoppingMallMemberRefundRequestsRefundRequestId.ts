import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteShoppingMallMemberRefundRequestsRefundRequestId(props: {
  member: MemberPayload;
  refundRequestId: string & tags.Format<"uuid">;
}): Promise<void> {
  const prisma = MyGlobal.prisma;
  let refundRequest = await prisma.shopping_mall_refund_requests.findUnique({
    where: { id: props.refundRequestId },
    select: {
      id: true,
      status: true,
      deleted_at: true,
      orderItem: {
        select: {
          id: true,
          order: {
            select: {
              shopping_customer_id: true,
              deleted_at: true,
            },
          },
        },
      },
    },
  });
  // Ensure we have a non-null record before continuing.
  if (refundRequest === null) {
    await prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { id: true },
    });
    refundRequest = await prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            order: {
              select: {
                shopping_customer_id: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  }
  // If deleted_at is not null, treat as not deletable.
  if (refundRequest === null || refundRequest.deleted_at !== null) {
    await prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { id: props.refundRequestId },
      select: { id: true },
    });
    // After the throw-or-return, we re-fetch to satisfy TS.
    refundRequest = await prisma.shopping_mall_refund_requests.findUnique({
      where: { id: props.refundRequestId },
      select: {
        id: true,
        status: true,
        deleted_at: true,
        orderItem: {
          select: {
            id: true,
            order: {
              select: {
                shopping_customer_id: true,
                deleted_at: true,
              },
            },
          },
        },
      },
    });
  }
  // Final guard to make TS happy; if we got here, refundRequest should be non-null.
  if (refundRequest === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (refundRequest.orderItem.order.shopping_customer_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Business rule: only allow permanent removal when the workflow is resolved.
  // Pending approvals must not be removed.
  if (refundRequest.status === "pending") {
    throw new HttpException(
      "Refund request cannot be deleted while pending",
      409,
    );
  }
  if (
    refundRequest.status === "approved" ||
    refundRequest.status === "rejected"
  ) {
    // eligible
  } else {
    // Unknown/other states are treated as not eligible for deletion to preserve workflow integrity.
    throw new HttpException(
      "Refund request cannot be deleted in its current state",
      409,
    );
  }
  await prisma.$transaction(async (tx) => {
    await tx.shopping_mall_refund_requests.delete({
      where: { id: props.refundRequestId },
    });
  });
}
