import { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerInventoryRecords(props: {
  seller: SellerPayload;
  body: IEcommerceMallInventoryRecord.ICreate;
}): Promise<IEcommerceMallInventoryRecord> {
  // Verify the product variant exists and belongs to this seller's product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.body.ecommerce_mall_product_variant_id },
      select: {
        id: true,
        stock_quantity: true,
        product_id: true,
      },
    });
  // Verify seller owns the product variant's product
  const product = await MyGlobal.prisma.ecommerce_mall_products.findUnique({
    where: { id: variant.product_id },
    select: { seller_id: true },
  });
  if (!product || product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Calculate remaining quantity by adding quantity_change to current stock
  const remaining_quantity: number =
    (variant.stock_quantity ?? 0) + props.body.quantity_change;
  // Create the inventory record
  const created = await MyGlobal.prisma.ecommerce_mall_inventory_records.create(
    {
      data: {
        id: v4(),
        ecommerce_mall_product_variant_id:
          props.body.ecommerce_mall_product_variant_id,
        quantity_change: props.body.quantity_change,
        remaining_quantity,
        reason: props.body.reason,
        type: props.body.type,
        description: props.body.description ?? null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
        ecommerce_mall_order_id: true,
        ecommerce_mall_cancellation_request_id: true,
        ecommerce_mall_refund_request_id: true,
        quantity_change: true,
        remaining_quantity: true,
        reason: true,
        type: true,
        description: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        variant: EcommerceMallProductVariantAtSummaryTransformer.select(),
      },
    },
  );
  return {
    id: created.id as string & tags.Format<"uuid">,
    variant_id: created.ecommerce_mall_product_variant_id as string &
      tags.Format<"uuid">,
    order_id: created.ecommerce_mall_order_id,
    cancellation_request_id:
      created.ecommerce_mall_cancellation_request_id ?? undefined,
    refund_request_id: created.ecommerce_mall_refund_request_id ?? undefined,
    quantity_change: created.quantity_change,
    remaining_quantity: created.remaining_quantity,
    reason: created.reason,
    type: created.type,
    description: created.description ?? undefined,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
    variant: await EcommerceMallProductVariantAtSummaryTransformer.transform(
      created.variant,
    ),
  };
}
