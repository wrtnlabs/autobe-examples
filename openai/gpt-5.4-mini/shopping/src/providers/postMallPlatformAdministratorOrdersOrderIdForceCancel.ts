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

export async function postMallPlatformAdministratorOrdersOrderIdForceCancel(props: {
  administrator: AdministratorPayload;
  orderId: string & tags.Format<"uuid">;
  body: IMallPlatformOrder.ICreate;
}): Promise<IMallPlatformOrder> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  if (
    props.body.scope !== "wholeOrder" &&
    props.body.scope !== "selectedItems"
  ) {
    throw new HttpException("Invalid cancellation scope.", 400);
  }
  if (props.body.scope === "selectedItems") {
    if (
      props.body.orderItemIds === undefined ||
      props.body.orderItemIds.length === 0
    ) {
      throw new HttpException(
        "orderItemIds are required when scope is selectedItems.",
        400,
      );
    }
    if (
      new Set(props.body.orderItemIds).size !== props.body.orderItemIds.length
    ) {
      throw new HttpException("Duplicate order item IDs are not allowed.", 400);
    }
  }
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const order = await tx.mall_platform_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: {
        id: true,
        status: true,
        orderItems: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    const targetItems =
      props.body.scope === "wholeOrder"
        ? order.orderItems
        : order.orderItems.filter((item) =>
            props.body.orderItemIds === undefined
              ? false
              : props.body.orderItemIds.includes(item.id),
          );
    if (props.body.scope === "selectedItems") {
      if (
        props.body.orderItemIds === undefined ||
        targetItems.length !== props.body.orderItemIds.length
      ) {
        throw new HttpException(
          "One or more targeted items do not belong to the order.",
          409,
        );
      }
    }
    if (targetItems.length === 0) {
      throw new HttpException(
        "No order items are eligible for cancellation.",
        409,
      );
    }
    for (const item of targetItems) {
      if (item.status !== "paid") {
        throw new HttpException(
          "Only paid order items can be force-cancelled.",
          409,
        );
      }
    }
    await tx.mall_platform_orders.update({
      where: { id: order.id },
      data: {
        status: "cancelled",
      },
    });
    return await tx.mall_platform_orders.findUniqueOrThrow({
      where: { id: order.id },
      ...MallPlatformOrderTransformer.select(),
    });
  });
  return await MallPlatformOrderTransformer.transform(record);
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
// export async function postMallPlatformAdministratorOrdersOrderIdForceCancel(props: {
//   administrator: AdministratorPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IMallPlatformOrder.ICreate;
// }): Promise<IMallPlatformOrder> {
//   const record = await MyGlobal.prisma.mall_platform_orders.findFirstOrThrow({
//     ...MallPlatformOrderTransformer.select(),
//     where: { ... },
//   });
//   return await MallPlatformOrderTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------