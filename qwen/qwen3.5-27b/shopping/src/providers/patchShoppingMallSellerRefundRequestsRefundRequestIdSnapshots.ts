import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRefundSnapshot";
import { IShoppingMallRefundSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallRefundSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallRefundSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallRefundSnapshot.IRequest;
}): Promise<IPageIShoppingMallRefundSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const sortBy = props.body.sortBy ?? "created_at";
  const sortOrder = props.body.sortOrder ?? "desc";
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_refund_requests.findUniqueOrThrow({
      where: {
        id: props.refundRequestId,
        deleted_at: null,
      },
      select: {
        shopping_mall_order_item_id: true,
      },
    });
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: {
        id: refundRequest.shopping_mall_order_item_id,
        deleted_at: null,
      },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const skip = (page - 1) * limit;
  const snapshots =
    await MyGlobal.prisma.shopping_mall_refund_snapshots.findMany({
      where: {
        shopping_mall_refund_request_id: props.refundRequestId,
      },
      skip,
      take: limit,
      orderBy: {
        created_at: sortOrder,
      },
      ...ShoppingMallRefundSnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_refund_snapshots.count({
    where: {
      shopping_mall_refund_request_id: props.refundRequestId,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      snapshots,
      ShoppingMallRefundSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
