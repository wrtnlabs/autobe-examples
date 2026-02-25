import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
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

export async function putShoppingMallSellerCancellationRequestsRequestIdReject(props: {
  seller: SellerPayload;
  requestId: string;
  body: IShoppingMallOrderCancellationRequest.IReject;
}): Promise<void> {
  const now = toISOStringSafe(new Date());
  const request =
    await MyGlobal.prisma.shopping_mall_order_cancellation_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          order_item_id: true,
          seller: {
            select: {
              id: true,
            },
          },
          orderItem: {
            select: {
              shopping_mall_order_seller_profile_snapshot_id: true,
            },
          },
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 409);
  }
  if (!request.seller || request.seller.id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.shopping_mall_order_cancellation_requests.update({
    where: { id: props.requestId },
    data: {
      status: "rejected",
      rejection_reason: props.body.rejection_reason ?? null,
      responded_by: props.seller.id,
      responded_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_order_cancellation_request_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_cancellation_request_id: props.requestId,
      responded_by: props.seller.id,
      from_status: "pending",
      to_status: "rejected",
      rejection_reason: props.body.rejection_reason ?? null,
      created_at: now,
    },
  });
}
