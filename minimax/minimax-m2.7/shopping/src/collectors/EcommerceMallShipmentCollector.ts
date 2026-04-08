import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace EcommerceMallShipmentCollector {
  /**
   * Collector for creating ecommerce_mall_shipments records.
   *
   * @param props.body - DTO containing carrier, trackingNumber, and itemIds
   * @param props.ecommerceMallSellers - Seller entity from authorized actor (JWT token)
   * @param props.ecommerceMallOrders - Order entity (derived from itemId path parameter)
   * @param props.ecommerceMallOrderItems - Order item entities (from itemIds path parameters)
   */
  export async function collect(props: {
    body: IEcommerceMallShipment.ICreate;
    ecommerceMallSellers: IEntity;
    ecommerceMallOrders: IEntity;
    ecommerceMallOrderItems: IEntity[];
  }) {
    return {
      // Scalar fields
      id: v4(),
      carrier: props.body.carrier,
      tracking_number: props.body.trackingNumber,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      // BelongsTo relations
      order: { connect: { id: props.ecommerceMallOrders.id } },
      seller: { connect: { id: props.ecommerceMallSellers.id } },
      // HasMany relations - create junction records for shipment items
      shipmentItems: {
        create: props.body.itemIds.map((itemId) => ({
          id: v4(),
          created_at: new Date(),
          orderItem: { connect: { id: itemId } },
        })),
      },
    } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//       export namespace EcommerceMallShipmentCollector {
//         export async function collect(props: {
//           body: IEcommerceMallShipment.ICreate;
//           ecommerceMallSellers: IEntity; // from authorized actor
// ecommerceMallOrders: IEntity; // from path parameter itemId
// ecommerceMallOrderItems: IEntity; // from path parameter itemId
//           
//           
//         }) {
//           return {
//       id: ...,
//       carrier: ...,
//       tracking_number: ...,
//       created_at: ...,
//       updated_at: ...,
//       deleted_at: ...,
//       order: ...,
//       seller: ...,
//       shipmentItems: ...,
//           } satisfies Prisma.ecommerce_mall_shipmentsCreateInput;
//         }
//       }
//--------------------------------------------------------------