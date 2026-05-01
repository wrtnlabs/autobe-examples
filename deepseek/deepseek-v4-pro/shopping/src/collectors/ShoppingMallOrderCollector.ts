import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { ShoppingMallOrderItemCollector } from "./ShoppingMallOrderItemCollector";

export namespace ShoppingMallOrderCollector {
  export async function collect(props: {
    body: IShoppingMallOrder.ICreate;
    shoppingMallCustomers: IEntity;
    shoppingMallCustomerSessions: IEntity;
  }) {
    const id: string = v4();
    const variantIds = props.body.items.map((item) => item.variant_id);
    const variants =
      await MyGlobal.prisma.shopping_mall_product_variants.findMany({
        where: { id: { in: variantIds } },
        select: { id: true, price: true },
      });
    const variantPriceMap = new Map(variants.map((v) => [v.id, v.price]));
    const total_price = props.body.items.reduce((sum, item) => {
      const price = variantPriceMap.get(item.variant_id) ?? 0;
      return sum + price * item.quantity;
    }, 0);
    const orderItems = await ArrayUtil.asyncMap(props.body.items, (item) =>
      ShoppingMallOrderItemCollector.collect({ body: item, order: { id } }),
    );
    const fixedOrderItems = orderItems.map((item) => ({
      ...item,
      price: item.price ?? 0,
    }));
    return {
      id,
      code: v4(),
      recipient_name: props.body.recipient_name,
      phone_number: props.body.phone_number,
      street_address: props.body.street_address,
      city: props.body.city,
      state_province: props.body.state_province,
      postal_code: props.body.postal_code,
      country: props.body.country,
      total_price,
      status: "paid",
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      customer: { connect: { id: props.shoppingMallCustomers.id } },
      orderItems: {
        create: fixedOrderItems,
      },
      shipments: undefined,
      reviews: undefined,
    } satisfies Prisma.shopping_mall_ordersCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace ShoppingMallOrderCollector {
//         export async function collect(props: {
//           body: IShoppingMallOrder.ICreate;
//           shoppingMallCustomers: IEntity; // from authorized actor
// shoppingMallCustomerSessions: IEntity; // from authorized session
//           
//           
//         }) {
//           return {
//       id: ...,
//       code: ...,
//       recipient_name: ...,
//       phone_number: ...,
//       street_address: ...,
//       city: ...,
//       state_province: ...,
//       postal_code: ...,
//       country: ...,
//       total_price: ...,
//       status: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       customer: ...,
//       orderItems: ...,
//       shipments: ...,
//       reviews: ...,
//           } satisfies Prisma.shopping_mall_ordersCreateInput;
//         }
//       }
//--------------------------------------------------------------