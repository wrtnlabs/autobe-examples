import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { EcommercePlatformOrderItemCollector } from "./EcommercePlatformOrderItemCollector";

export namespace EcommercePlatformOrderCollector {
  export async function collect(props: {
    body: IEcommercePlatformOrder.ICreate;
    ecommercePlatformCustomerProfiles: IEntity;
  }) {
    const id = v4();
    return {
      id,
      order_number: `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
      status: "pending",
      created_at: new Date(),
      updated_at: new Date(),
      customerProfile: {
        connect: { id: props.ecommercePlatformCustomerProfiles.id },
      },
      shippingAddress: { connect: { id: props.body.shipping_address_id } },
      items: {
        create: await ArrayUtil.asyncMap(props.body.items, (item) =>
          EcommercePlatformOrderItemCollector.collect({
            body: item,
            order: { id },
          }),
        ),
      },
      reviews: undefined,
    } satisfies Prisma.ecommerce_platform_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommercePlatformOrderCollector {
//         export async function collect(props: {
//           body: IEcommercePlatformOrder.ICreate;
//           ecommercePlatformCustomerProfiles: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       order_number: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       customerProfile: ...,
//       shippingAddress: ...,
//       reviews: ...,
//       items: ...,
//           } satisfies Prisma.ecommerce_platform_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------