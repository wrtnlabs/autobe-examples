import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformOrderTransformer } from "../transformers/MallPlatformOrderTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postMallPlatformAdministratorOrdersOrderIdForceRefund(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  body: IMallPlatformOrder.IForceRefund;
}): Promise<IMallPlatformOrder> {
  await MyGlobal.prisma.mall_platform_administrators.findFirstOrThrow({
    where: {
      id: props.administrator.id,
    },
    select: {
      id: true,
    },
  });
  const updated = await MyGlobal.prisma.$transaction(async (prisma) => {
    const order = await prisma.mall_platform_orders.findFirstOrThrow({
      where: {
        id: props.orderId,
      },
      ...MallPlatformOrderTransformer.select(),
    });
    const orderItemIds = props.body.orderItemIds;
    const targetItems =
      orderItemIds === undefined
        ? order.orderItems
        : order.orderItems.filter((item) => orderItemIds.includes(item.id));
    if (
      orderItemIds !== undefined &&
      targetItems.length !== orderItemIds.length
    ) {
      throw new HttpException(
        "One or more order items do not belong to the target order.",
        400,
      );
    }
    if (targetItems.length === 0) {
      throw new HttpException(
        "No eligible order items were found for forced refund.",
        400,
      );
    }
    const invalidItem = targetItems.find(
      (item) =>
        item.status !== "paid" &&
        item.status !== "shipped" &&
        item.status !== "delivered",
    );
    if (invalidItem !== undefined) {
      throw new HttpException(
        "One or more order items are not eligible for forced refund.",
        400,
      );
    }
    for (const item of targetItems) {
      await prisma.mall_platform_order_items.update({
        where: {
          id: item.id,
        },
        data: {
          status: "refunded",
        },
      });
    }
    await prisma.mall_platform_orders.update({
      where: {
        id: props.orderId,
      },
      data: {
        status: "refunded",
      },
    });
    return await prisma.mall_platform_orders.findFirstOrThrow({
      where: {
        id: props.orderId,
      },
      ...MallPlatformOrderTransformer.select(),
    });
  });
  return await MallPlatformOrderTransformer.transform(updated);
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
// import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
// import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
// import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
// import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
// import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
// import { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
// import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postMallPlatformAdministratorOrdersOrderIdForceRefund(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrder.IForceRefund;
// }): Promise<IMallPlatformOrder> {
//   const record = await MyGlobal.prisma.mall_platform_orders.findFirstOrThrow({
//     ...MallPlatformOrderTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------