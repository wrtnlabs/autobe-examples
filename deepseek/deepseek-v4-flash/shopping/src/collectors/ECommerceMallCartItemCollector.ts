import { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ECommerceMallCartItemCollector {
  export async function collect(props: {
    body: IECommerceMallCartItem.ICreate;
    eCommerceMallCustomers: IEntity;
    eCommerceMallCustomerSessions: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.eCommerceMallCustomers.id } },
      productVariant: { connect: { id: props.body.product_variant_id } },
    } satisfies Prisma.e_commerce_mall_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ECommerceMallCartItemCollector {
//         export async function collect(props: {
//           body: IECommerceMallCartItem.ICreate;
//           eCommerceMallCustomers: IEntity; // from authorized actor
// eCommerceMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       productVariant: ...,
//           } satisfies Prisma.e_commerce_mall_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------