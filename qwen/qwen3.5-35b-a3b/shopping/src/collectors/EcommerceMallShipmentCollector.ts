import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentCollector {
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    ecommerceMallOrders: IEntity;
    ecommerceMallSellers: IEntity;
  }) {
    // Query order items to get their IDs using FK column names in where clause
    const orderItems = await ArrayUtil.asyncMap(
      props.body.order_items,
      async (item) => {
        const existingOrderItem =
          await MyGlobal.prisma.ecommerce_mall_order_items.findFirst({
            where: {
              order_id: props.ecommerceMallOrders.id,
              ecommerce_mall_product_id: item.product_id,
              ecommerce_mall_product_variant_id: item.variant_id,
            },
          });
        if (!existingOrderItem) {
          throw new Error(
            `Order item not found for product ${item.product_id} and variant ${item.variant_id}`,
          );
        }
        return existingOrderItem;
      },
    );
    const id: string = v4();
    return {
      id,
      carrier_name: props.body.carrier_name,
      tracking_number: props.body.tracking_number,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      order: { connect: { id: props.ecommerceMallOrders.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      shipmentItems: orderItems.length
        ? {
            create: orderItems.map((orderItem) => ({
              id: v4(),
              orderItem: { connect: { id: orderItem.id } },
              created_at: new Date(),
              updated_at: new Date(),
            })),
          }
        : undefined,
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}
