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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrderItemsOrderItemIdRefundRequestSnapshots(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundRequestSnapshot> {
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        order: {
          select: {
            shopping_mall_customer_id: true,
          },
        },
      },
    });
  if (orderItem.order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: { shopping_mall_order_item_id: props.orderItemId },
      select: {
        id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const where = {
    shopping_mall_refund_request_id: refundRequest.id,
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            {
              reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              response_message: {
                contains: props.body.search,
                mode: "insensitive",
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
        created_at: props.body.order ?? "desc",
      },
      select: {
        id: true,
        status: true,
        reason: true,
        response_message: true,
        created_at: true,
        refundRequest: {
          select: {
            id: true,
          },
        },
      },
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
    } satisfies IPage.IPagination,
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          status: snapshot.status,
          reason: snapshot.reason,
          responseMessage: snapshot.response_message,
          createdAt: toISOStringSafe(snapshot.created_at),
          refundRequest: {
            id: snapshot.refundRequest.id,
          },
        }) satisfies IShoppingMallRefundRequestSnapshot,
    ),
  };
}
