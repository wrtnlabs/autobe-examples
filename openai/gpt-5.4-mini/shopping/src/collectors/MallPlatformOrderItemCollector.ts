import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace MallPlatformOrderItemCollector {
  export async function collect(props: {
    body: IMallPlatformOrderItem.ICreate;
    order: IEntity;
    productVariant: IEntity;
    seller: IEntity;
  }) {
    const id: string = v4();
    return {
      id,
      quantity: props.body.quantity,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.order.id } },
      productVariant: { connect: { id: props.productVariant.id } },
      seller: { connect: { id: props.seller.id } },
    } satisfies Prisma.mall_platform_order_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace MallPlatformOrderItemCollector {
//         export async function collect(props: {
//           body: IMallPlatformOrderItem.ICreate;
//           
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       order: ...,
//       productVariant: ...,
//       seller: ...,
//       shipmentItem: ...,
//       cancellationRequests: ...,
//       refundRequests: ...,
//       review: ...,
//       snapshots: ...,
//           } satisfies Prisma.mall_platform_order_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------