import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformShipmentCollector } from "../collectors/EcommercePlatformShipmentCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformShipmentTransformer } from "../transformers/EcommercePlatformShipmentTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommercePlatformSellerShipments(props: {
  seller: SellerPayload;
  body: IEcommercePlatformShipment.ICreate;
}): Promise<IEcommercePlatformShipment> {
  const duplicateShipment =
    await MyGlobal.prisma.ecommerce_platform_shipments.findFirst({
      where: {
        carrier_name: props.body.carrierName,
        tracking_number: props.body.trackingNumber,
      },
    });
  if (duplicateShipment !== null) {
    throw new HttpException("Duplicate carrier tracking number", 409);
  }
  const validatedOrderItems: Prisma.ecommerce_platform_order_itemsGetPayload<{
    select: {
      status: true;
      shipmentItem: {
        select: {
          id: true;
        };
      };
      productVariant: {
        select: {
          product: {
            select: {
              sellerProfile: {
                select: {
                  seller: {
                    select: {
                      id: true;
                    };
                  };
                };
              };
            };
          };
        };
      };
    };
  }>[] = await ArrayUtil.asyncMap(
    props.body.orderItemIds,
    async (oid) =>
      await MyGlobal.prisma.ecommerce_platform_order_items.findUniqueOrThrow({
        where: { id: oid },
        select: {
          status: true,
          shipmentItem: {
            select: { id: true },
          },
          productVariant: {
            select: {
              product: {
                select: {
                  sellerProfile: {
                    select: {
                      seller: {
                        select: { id: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }),
  );
  for (const item of validatedOrderItems) {
    if (
      item.productVariant.product.sellerProfile.seller.id !== props.seller.id
    ) {
      throw new HttpException("Order item belongs to another seller", 400);
    }
    if (item.status !== "paid") {
      throw new HttpException("Order item status is not paid", 400);
    }
    if (item.shipmentItem !== null) {
      throw new HttpException("Order item already assigned to a shipment", 400);
    }
  }
  const record = await MyGlobal.prisma.ecommerce_platform_shipments.create({
    data: await EcommercePlatformShipmentCollector.collect({
      body: props.body,
      ecommercePlatformSellers: { id: props.seller.id } satisfies IEntity,
    }),
    ...EcommercePlatformShipmentTransformer.select(),
  });
  await MyGlobal.prisma.ecommerce_platform_order_items.updateMany({
    where: { id: { in: props.body.orderItemIds } },
    data: {
      status: "shipped",
      updated_at: new Date(),
    },
  });
  return await EcommercePlatformShipmentTransformer.transform(record);
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
// import { IEcommercePlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipment";
// import { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommercePlatformSellerShipments(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformShipment.ICreate;
// }): Promise<IEcommercePlatformShipment> {
//   const record = await MyGlobal.prisma.ecommerce_platform_shipments.create({
//     data: await EcommercePlatformShipmentCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommercePlatformShipmentTransformer.select(),
//   });
//   return await EcommercePlatformShipmentTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------