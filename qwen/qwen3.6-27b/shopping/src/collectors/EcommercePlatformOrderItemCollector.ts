import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommercePlatformOrderItemCollector {
  export async function collect(props: {
    body: IEcommercePlatformOrderItem.ICreate;
    order: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      quantity: props.body.quantity,
      price: props.body.price,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations
      order: { connect: { id: props.order.id } },
      productVariant: {
        connect: { id: props.body.ecommerce_platform_product_variant_id },
      },
    } satisfies Prisma.ecommerce_platform_order_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformOrderItemCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformOrderItem.ICreate;
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
//       shipmentItem: ...,
//       cancellationRequests: ...,
//       refundRequest: ...,
//       itemSnapshots: ...,
//           } satisfies Prisma.ecommerce_platform_order_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------