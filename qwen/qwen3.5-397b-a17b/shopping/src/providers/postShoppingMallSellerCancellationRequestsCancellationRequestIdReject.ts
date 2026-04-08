import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
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

export async function postShoppingMallSellerCancellationRequestsCancellationRequestIdReject(props: {
  seller: SellerPayload;
  cancellationRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallCancellationRequest.IReject;
}): Promise<IShoppingMallCancellationRequest> {
  const cancellationRequest =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirstOrThrow({
      where: {
        id: props.cancellationRequestId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        reason: true,
        orderItem: {
          select: {
            product: {
              select: {
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (
    cancellationRequest.orderItem.product.shopping_mall_seller_id !==
    props.seller.id
  ) {
    throw new HttpException("Forbidden: You do not own this product", 403);
  }
  if (cancellationRequest.status !== "pending") {
    throw new HttpException(
      "Cancellation request has already been responded to",
      400,
    );
  }
  const now = new Date();
  await MyGlobal.prisma.shopping_mall_cancellation_requests.update({
    where: {
      id: props.cancellationRequestId,
    },
    data: {
      status: "rejected",
      responded_at: now,
      updated_at: now,
    },
  });
  await MyGlobal.prisma.shopping_mall_cancellation_request_snapshots.create({
    data: {
      id: v4(),
      cancellation_request_id: props.cancellationRequestId,
      status: "rejected",
      reason: cancellationRequest.reason,
      response_reason: props.body.reason,
      reviewed_at: now,
      created_at: now,
    },
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findUniqueOrThrow(
      {
        where: {
          id: props.cancellationRequestId,
        },
        ...ShoppingMallCancellationRequestTransformer.select(),
      },
    );
  return await ShoppingMallCancellationRequestTransformer.transform(updated);
}
