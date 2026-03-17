import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallCancellationRequestTransformer } from "../transformers/ShoppingMallCancellationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSellerCancellationRequestsCancellationRequestId(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IUpdate;
}): Promise<IShoppingMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
          deleted_at: null,
        },
        select: {
          id: true,
          reason: true,
          status: true,
          requested_at: true,
          responded_at: true,
          orderItem: {
            select: {
              id: true,
              shopping_mall_seller_id: true,
            },
          },
        },
      },
    );
  if (cancellationRequest.status !== "PENDING") {
    throw new HttpException(
      "Cancellation request has already been responded to",
      400,
    );
  }
  if (
    cancellationRequest.orderItem.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException(
      "Forbidden: Not the seller of this order item",
      403,
    );
  }
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      cancellation_request_id: cancellationRequest.id,
      responded_by_seller_id: props.seller.id,
      reason: cancellationRequest.reason,
      status: cancellationRequest.status,
      requested_at: cancellationRequest.requested_at,
      responded_at: cancellationRequest.responded_at,
      created_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
      where: {
        id: props.cancellationRequestId,
      },
      data: {
        ...(props.body.status !== undefined && { status: props.body.status }),
        ...(props.body.responded_at !== undefined && {
          responded_at:
            props.body.responded_at !== null
              ? new Date(props.body.responded_at)
              : null,
        }),
        responded_by_seller_id: props.seller.id,
        updated_at: new Date(),
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
