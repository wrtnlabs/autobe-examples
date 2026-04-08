import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCartItemCollector {
  /**
   * Collector for creating cart item records.
   * Transforms IEcommerceMallCartItem.ICreate DTO to Prisma CreateInput.
   */
  export async function collect(props: {
    body: IEcommerceMallCartItem.ICreate;
    ecommerceMallCarts: IEntity;
  }) {
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      cart: { connect: { id: props.ecommerceMallCarts.id } },
      productVariant: { connect: { id: props.body.productVariantId } },
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCartItemCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCartItem.ICreate;
//           ecommerceMallCarts: IEntity; // from authorized session
// ecommerceMallCustomers: IEntity; // from authorized actor
//           
//           
//         }) {
//           return {
//       id: ...,
//       quantity: ...,
//       created_at: ...,
//       updated_at: ...,
//       cart: ...,
//       productVariant: ...,
//           } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
//         }
//       }
//--------------------------------------------------------------