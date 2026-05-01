import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallOrderItemCollector {
  export async function collect(props: {
    body: IShoppingMallOrderItem.ICreate;
    order: IEntity;
  }) {
    const id: string = v4();
    const variant =
      await MyGlobal.prisma.shopping_mall_product_variants.findFirstOrThrow({
        where: { id: props.body.variant_id },
      });
    return {
      id,
      quantity: props.body.quantity,
      price: variant.price ?? 0,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      order: { connect: { id: props.order.id } },
      productVariant: { connect: { id: props.body.variant_id } },
      shipment: undefined,
      cancellationRequests: undefined,
      refundRequests: undefined,
      productSnapshot: undefined,
      variantSnapshot: undefined,
      sellerSnapshot: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_order_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallOrderItemCollector {
//         export async function collect(props: {
//           body: IShoppingMallOrderItem.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       price: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       order: ...,
//       productVariant: ...,
//       shipment: ...,
//       cancellationRequests: ...,
//       refundRequests: ...,
//       productSnapshot: ...,
//       variantSnapshot: ...,
//       sellerSnapshot: ...,
//       reviews: ...,
//           } satisfies Prisma.shopping_mall_order_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------