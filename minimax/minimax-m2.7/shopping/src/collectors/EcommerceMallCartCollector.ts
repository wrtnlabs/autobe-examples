import { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallCartCollector {
  export async function collect(props: {
    body: IEcommerceMallCart.ICreate;
    ecommerceMallCustomers: IEntity;
    ecommerceMallCustomerSessions: IEntity;
  }) {
    // Indirect reference pattern: query or create customer's cart
    let cart = await MyGlobal.prisma.ecommerce_mall_carts.findFirst({
      where: { ecommerce_mall_customer_id: props.ecommerceMallCustomers.id },
    });
    if (!cart) {
      // Create new cart for customer
      cart = await MyGlobal.prisma.ecommerce_mall_carts.create({
        data: {
          id: v4(),
          customer: { connect: { id: props.ecommerceMallCustomers.id } },
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
    return {
      id: v4(),
      quantity: props.body.quantity,
      created_at: new Date(),
      updated_at: new Date(),
      cart: { connect: { id: cart.id } },
      productVariant: { connect: { id: props.body.variantId } },
    } satisfies Prisma.ecommerce_mall_cart_itemsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallCartCollector {
//         export async function collect(props: {
//           body: IEcommerceMallCart.ICreate;
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