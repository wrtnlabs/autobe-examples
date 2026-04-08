import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeDeliveriesPending(props: {
  customer: CustomerPayload;
}): Promise<IPageIEcommerceMallShipment.IDelivery.ISummary> {
  const page: number & tags.Type<"int32"> = 1;
  const limit: number & tags.Type<"int32"> = 20;
  const skip: number = (page - 1) * limit;
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    where: {
      deleted_at: null,
      order: {
        deleted_at: null,
        ecommerce_mall_customer_id: props.customer.id,
      },
      shipmentItems: {
        some: {
          orderItem: {
            status: "shipped",
          },
        },
      },
    },
    include: {
      shipmentItems: {
        include: {
          orderItem: {
            include: {
              productSnapshot: {
                include: {
                  productSnapshotImages: {
                    where: {
                      display_order: 0,
                    },
                    take: 1,
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      created_at: "desc",
    },
    skip: skip,
    take: limit,
  });
  const data: IEcommerceMallShipment.IDelivery.ISummary[] = shipments.flatMap(
    (shipment) =>
      shipment.shipmentItems
        .filter((si) => si.orderItem.status === "shipped")
        .map((shipmentItem) => {
          const orderItem = shipmentItem.orderItem;
          const productSnapshot = orderItem.productSnapshot;
          const firstImage = productSnapshot.productSnapshotImages[0];
          return {
            id: orderItem.id,
            quantity: orderItem.quantity,
            unitPrice: productSnapshot.base_price,
            productName: productSnapshot.name,
            productImage: firstImage?.url ?? "",
          } satisfies IEcommerceMallShipment.IDelivery.ISummary;
        }),
  );
  const totalCount = await MyGlobal.prisma.ecommerce_mall_shipments.count({
    where: {
      deleted_at: null,
      order: {
        deleted_at: null,
        ecommerce_mall_customer_id: props.customer.id,
      },
      shipmentItems: {
        some: {
          orderItem: {
            status: "shipped",
          },
        },
      },
    },
  });
  const totalPages = Math.ceil(totalCount / limit);
  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: totalCount,
      pages: totalPages,
    },
    data: data,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IPageIEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeDeliveriesPending(props: {
//   customer: CustomerPayload;
// }): Promise<IPageIEcommerceMallShipment.IDelivery.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------