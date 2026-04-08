import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCartItemCollector {
  export async function collect(props: {
    body: IEcommerceMallCartItem.ICreate;
    ecommerceMallCustomers: IEntity;
  }) {
    return {
      id: v4(),
      customer: { connect: { id: props.ecommerceMallCustomers.id } },
      productVariant: { connect: { id: props.body.productVariantId } },
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCartItemCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCartItem.ICreate;
//           ecommerceMallCustomers: IEntity; // from authorized actor
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
//           } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------