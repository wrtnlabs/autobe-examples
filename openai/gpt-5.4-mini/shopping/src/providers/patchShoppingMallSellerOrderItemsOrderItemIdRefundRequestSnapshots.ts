import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundRequestSnapshot";
import { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import { IShoppingMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequestSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundRequestSnapshotTransformer } from "../transformers/ShoppingMallRefundRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerOrderItemsOrderItemIdRefundRequestSnapshots(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        productVariant: {
          select: {
            id: true,
            product: {
              select: {
                id: true,
                shopping_mall_seller_id: true,
              },
            },
          },
        },
      },
    });
  if (
    orderItem.productVariant.product.shopping_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { shopping_mall_order_item_id: orderItem.id },
      select: {
        id: true,
      },
    });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_refund_request_id: refundRequest.id,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              reason: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              response_message: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }),
  } satisfies Prisma.shopping_mall_refund_request_snapshotsWhereInput;
  const data =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        created_at: props.body.order === "asc" ? "asc" : "desc",
      },
      ...ShoppingMallRefundRequestSnapshotTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.shopping_mall_refund_request_snapshots.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallRefundRequestSnapshotTransformer.transform,
    ),
  };
}
