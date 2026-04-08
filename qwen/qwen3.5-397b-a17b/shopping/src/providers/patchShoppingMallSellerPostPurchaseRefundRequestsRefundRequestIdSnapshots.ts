import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPostPurchaseRefundRequestSnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallPostPurchaseRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequest";
import { IShoppingMallPostPurchaseRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPostPurchaseRefundRequestSnapshot";
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
import { ShoppingMallPostPurchaseRefundRequestSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallPostPurchaseRefundRequestSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerPostPurchaseRefundRequestsRefundRequestIdSnapshots(props: {
  seller: SellerPayload;
  refundRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallPostPurchaseRefundRequestSnapshot.IRequest;
}): Promise<IPageIShoppingMallPostPurchaseRefundRequestSnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  // Verify refund request exists
  const refundRequest =
    await MyGlobal.prisma.shopping_mall_post_purchase_refund_requests.findUniqueOrThrow(
      {
        where: { id: props.refundRequestId },
        select: {
          shopping_mall_order_item_id: true,
        },
      },
    );
  // Verify seller owns the order item
  const orderItem =
    await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
      where: { id: refundRequest.shopping_mall_order_item_id },
      select: {
        shopping_mall_seller_id: true,
      },
    });
  if (orderItem.shopping_mall_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build WHERE clause
  const whereInput = {
    shopping_mall_post_purchase_refund_request_id: props.refundRequestId,
    ...(props.body.status && { status: props.body.status }),
  } satisfies Prisma.shopping_mall_post_purchase_refund_request_snapshotsWhereInput;
  // Build ORDER BY clause
  const orderByInput = (
    props.body.sort === "desc"
      ? { created_at: "desc" as const }
      : { created_at: "asc" as const }
  ) satisfies Prisma.shopping_mall_post_purchase_refund_request_snapshotsOrderByWithRelationInput;
  // Query snapshots
  const data =
    await MyGlobal.prisma.shopping_mall_post_purchase_refund_request_snapshots.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: orderByInput,
        ...ShoppingMallPostPurchaseRefundRequestSnapshotAtSummaryTransformer.select(),
      },
    );
  // Count total records
  const total =
    await MyGlobal.prisma.shopping_mall_post_purchase_refund_request_snapshots.count(
      {
        where: whereInput,
      },
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallPostPurchaseRefundRequestSnapshotAtSummaryTransformer.transform,
    ),
  };
}
