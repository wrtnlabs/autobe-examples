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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerShipmentsShipmentIdItems(props: {
  customer: CustomerPayload;
  shipmentId: string & tags.Format<"uuid">;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  // Verify shipment exists and customer owns the order
  const shipment = await MyGlobal.prisma.ecommerce_mall_shipments.findFirst({
    where: {
      id: props.shipmentId,
      deleted_at: null,
    },
    select: {
      order: {
        select: {
          customer_id: true,
        },
      },
    },
  });
  if (shipment === null) {
    throw new HttpException("Shipment not found", 404);
  }
  if (shipment.order.customer_id !== props.customer.id) {
    throw new HttpException(
      "Forbidden - you do not have access to this shipment",
      403,
    );
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput = {
    shipmentItem: {
      shipment_id: props.shipmentId,
    },
    ...(props.body.status !== undefined && { status: props.body.status }),
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
    ...(props.body.createdAtFrom !== undefined &&
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            gte: new Date(props.body.createdAtFrom),
            lte: new Date(props.body.createdAtTo),
          },
        }
      : props.body.createdAtFrom !== undefined
        ? { created_at: { gte: new Date(props.body.createdAtFrom) } }
        : props.body.createdAtTo !== undefined
          ? { created_at: { lte: new Date(props.body.createdAtTo) } }
          : undefined),
    ...(props.body.search !== undefined && {
      product: {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderByInput = (
    props.body.sort === "status"
      ? { status: (props.body.order ?? "asc") as "asc" | "desc" }
      : props.body.sort === "seller_id"
        ? { seller_id: (props.body.order ?? "asc") as "asc" | "desc" }
        : props.body.sort === "price_at_purchase"
          ? { price_at_purchase: (props.body.order ?? "asc") as "asc" | "desc" }
          : props.body.sort === "quantity"
            ? { quantity: (props.body.order ?? "asc") as "asc" | "desc" }
            : { created_at: (props.body.order ?? "desc") as "asc" | "desc" }
  ) satisfies Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput;
  const orderItems = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    orderItems,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
