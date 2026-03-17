import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerShipmentsShipmentIdItems(props: {
  seller: SellerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists and belongs to this seller
  const shipment =
    await MyGlobal.prisma.ecommerce_mall_shipments.findUniqueOrThrow({
      where: { id: props.shipmentId },
      select: { seller_id: true },
    });
  if (shipment.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Build where conditions using AND array for proper filter combination
  const whereConditions: Prisma.ecommerce_mall_order_itemsWhereInput = {
    AND: [
      {
        shipmentItem: {
          shipment_id: props.shipmentId,
        },
      },
      ...(props.body.status ? [{ status: props.body.status }] : []),
      ...(props.body.search
        ? [
            {
              product: {
                name: {
                  contains: props.body.search,
                  mode: "insensitive" as Prisma.QueryMode,
                },
                deleted_at: null,
              },
            },
          ]
        : []),
      ...(props.body.createdAtFrom || props.body.createdAtTo
        ? [
            {
              created_at: {
                ...(props.body.createdAtFrom && {
                  gte: new Date(props.body.createdAtFrom),
                }),
                ...(props.body.createdAtTo && {
                  lte: new Date(props.body.createdAtTo),
                }),
              },
            },
          ]
        : []),
    ],
  };
  // Determine sort order with proper typing
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.order ?? "desc";
  const orderBy: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    sortField === "status"
      ? { status: sortDirection }
      : { created_at: sortDirection };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Query order items with filters and transformer select
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereConditions,
    skip,
    take: limit,
    orderBy,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  // Count total matching records
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereConditions,
  });
  // Transform results using neighbor transformer
  const data = await ArrayUtil.asyncMap(
    orderItems as any,
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
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
