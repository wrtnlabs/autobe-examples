import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallOrderItemRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemRefundRequest";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemRefundRequestTransformer } from "../transformers/EcommerceMallOrderItemRefundRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerOrderItemsOrderItemIdRefundRequestsRequestId(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallOrderItemRefundRequest> {
  // Verify the order item exists and get the product variant reference
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findUniqueOrThrow({
      where: { id: props.orderItemId },
      select: {
        id: true,
        ecommerce_mall_product_variant_id: true,
      },
    } satisfies Prisma.ecommerce_mall_order_itemsFindUniqueArgs);
  // Get the product variant
  const productVariant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
      where: {
        id: orderItem.ecommerce_mall_product_variant_id,
      },
      select: { id: true, ecommerce_mall_product_id: true },
    } satisfies Prisma.ecommerce_mall_product_variantsFindFirstArgs);
  // Verify the product belongs to the seller
  await MyGlobal.prisma.ecommerce_mall_products.findFirstOrThrow({
    where: {
      id: productVariant.ecommerce_mall_product_id,
      seller_id: props.seller.id,
      deleted_at: null,
    },
    select: { id: true },
  } satisfies Prisma.ecommerce_mall_productsFindFirstArgs);
  // Query the refund request
  const refundRequest =
    await MyGlobal.prisma.ecommerce_mall_order_item_refund_requests.findUniqueOrThrow(
      {
        where: {
          id: props.requestId,
          ecommerce_mall_order_item_id: props.orderItemId,
        },
        ...EcommerceMallOrderItemRefundRequestTransformer.select(),
      } satisfies Prisma.ecommerce_mall_order_item_refund_requestsFindUniqueArgs,
    );
  return await EcommerceMallOrderItemRefundRequestTransformer.transform(
    refundRequest,
  );
}
