import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallOrderItemCollector {
  export async function collect(props: {
    body: IEcommerceMallOrderItem.ICreate;
    order: IEntity;
  }) {
    const id: string = v4();
    // Query product variant with product relation to get price and seller_id
    const variant =
      await MyGlobal.prisma.ecommerce_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.product_variant_id },
        include: {
          product: {
            select: { seller_id: true },
          },
        },
      });
    const quantity = props.body.quantity;
    const unitPrice = variant.price ?? 0;
    const subtotal = unitPrice * quantity;
    return {
      id,
      quantity,
      unit_price: unitPrice,
      subtotal,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.order.id } },
      productVariant: { connect: { id: props.body.product_variant_id } },
      seller: { connect: { id: variant.product.seller_id } },
    } satisfies Prisma.ecommerce_mall_order_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallOrderItemCollector {
//         export async function collect(props: {
//           body: IEcommerceMallOrderItem.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       unit_price: ...,
//       subtotal: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       order: ...,
//       productVariant: ...,
//       seller: ...,
//       customerReviews: ...,
//       shipmentItems: ...,
//       cancellationRequestItem: ...,
//       refundRequestItem: ...,
//       reviews: ...,
//       reviewSnapshots: ...,
//       ecommerceMallOrderItemSnapshotss: ...,
//       snapshots: ...,
//           } satisfies Prisma.ecommerce_mall_order_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------