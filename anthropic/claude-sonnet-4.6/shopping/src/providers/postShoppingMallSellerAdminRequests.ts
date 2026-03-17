import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshot";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { IShoppingMallProductSnapshotSkus } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkus";
import { IShoppingMallProductSnapshotSkusOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSkusOption";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
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

export async function postShoppingMallSellerAdminRequests(props: {
  seller: SellerPayload;
  body: IShoppingMallCancellationRequest.ICreate;
}): Promise<IShoppingMallCancellationRequest> {
  // Business rule: A seller may only have one pending admin request at a time.
  // We find any existing pending cancellation request that is linked to an order item
  // whose snapshot was created by this seller.
  const existingPending =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.findFirst({
      where: {
        status: "pending",
        orderItem: {
          snapshot: {
            sellerProfileSnapshot: {
              seller: { id: props.seller.id },
            },
          },
        },
      },
      select: { id: true },
    });
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending admin request. Please wait for the existing request to be resolved.",
      409,
    );
  }
  // Find an eligible order item owned by this seller (one without an existing cancellation request)
  // to serve as the required FK reference for this admin request record.
  const sellerOrderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findFirstOrThrow({
      where: {
        cancellationRequest: null,
        snapshot: {
          sellerProfileSnapshot: {
            seller: { id: props.seller.id },
          },
        },
      },
      select: { id: true },
    });
  const created =
    await MyGlobal.prisma.shopping_mall_cancellation_requests.create({
      data: {
        id: v4(),
        status: "pending",
        reason: props.body.reason,
        created_at: new Date(),
        updated_at: new Date(),
        orderItem: { connect: { id: sellerOrderItem.id } },
      },
      ...ShoppingMallCancellationRequestTransformer.select(),
    });
  return ShoppingMallCancellationRequestTransformer.transform(created);
}
