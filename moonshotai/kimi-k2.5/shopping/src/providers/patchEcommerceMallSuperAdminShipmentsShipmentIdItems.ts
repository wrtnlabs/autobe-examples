import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSuperAdminShipmentsShipmentIdItems(props: {
  superAdmin: SuperadminPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists
  await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
    where: { id: props.shipmentId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause for order items with filters
  const orderItemWhere = {
    ...(props.body.orderId !== undefined && { order_id: props.body.orderId }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.variantId !== undefined && {
      variant_id: props.body.variantId,
    }),
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const whereInput = {
    shipment_id: props.shipmentId,
    ...(Object.keys(orderItemWhere).length > 0 && {
      orderItem: orderItemWhere,
    }),
  } satisfies Prisma.ecommerce_mall_shipment_itemsWhereInput;
  // Query shipment items with order item details
  const shipmentItems =
    await MyGlobal.prisma.ecommerce_mall_shipment_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        orderItem: EcommerceMallOrderItemAtSummaryTransformer.select(),
      },
    });
  // Get total count
  const total = await MyGlobal.prisma.ecommerce_mall_shipment_items.count({
    where: whereInput,
  });
  // Transform order items
  const data = await ArrayUtil.asyncMap(
    shipmentItems.map((si) => si.orderItem),
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
