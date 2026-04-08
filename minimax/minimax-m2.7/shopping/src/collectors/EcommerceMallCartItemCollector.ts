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
    cart: IEntity;
  }) {
    return {
      // Scalar fields
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      // BelongsTo relations (MUST use connect, relation name NOT table name)
      cart: { connect: { id: props.cart.id } },
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
//           ecommerceMallCustomers: IEntity; // from authorized actor
// ecommerceMallCustomerSessions: IEntity; // from authorized session
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