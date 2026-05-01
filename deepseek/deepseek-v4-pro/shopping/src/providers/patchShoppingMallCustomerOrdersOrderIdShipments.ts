import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallShipmentAtSummaryTransformer } from "../transformers/ShoppingMallShipmentAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  body: IShoppingMallShipment.IRequest;
}): Promise<IPageIShoppingMallShipment.ISummary> {
  const order = await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: { id: true, shopping_mall_customer_id: true },
  });
  if (order.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.shopping_mall_shipmentsWhereInput = {
    shopping_mall_order_id: props.orderId,
    deleted_at: null,
  };
  if (props.body.deliveryStatus === "pending") {
    whereInput.delivered_at = null;
  } else if (props.body.deliveryStatus === "delivered") {
    whereInput.delivered_at = { not: null };
  }
  const isCursorBased: boolean = props.body.cursor !== undefined;
  const take: number = isCursorBased
    ? (props.body.pageSize ?? 20)
    : (props.body.limit ?? 100);
  let decodedCursorId: string | null = null;
  if (isCursorBased && props.body.cursor) {
    try {
      const raw: unknown = JSON.parse(
        Buffer.from(props.body.cursor, "base64").toString(),
      );
      if (raw !== null && typeof raw === "object") {
        const idValue: unknown = Reflect.get(raw, "id");
        if (typeof idValue === "string") {
          decodedCursorId = idValue;
        }
      }
    } catch {
      decodedCursorId = null;
    }
  }
  const page: number = props.body.page ?? 1;
  const skip: number = isCursorBased
    ? decodedCursorId !== null
      ? 1
      : 0
    : (page - 1) * take;
  const data = await MyGlobal.prisma.shopping_mall_shipments.findMany({
    where: whereInput,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    take,
    skip,
    ...(decodedCursorId !== null ? { cursor: { id: decodedCursorId } } : {}),
    ...ShoppingMallShipmentAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_shipments.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: take,
      records: total,
      pages: Math.ceil(total / take),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      ShoppingMallShipmentAtSummaryTransformer.transform,
    ),
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
// import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
// import { IPageIShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShipment";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
// import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
// import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
// import { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
// import { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
// import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
// import { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerOrdersOrderIdShipments(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   body: IShoppingMallShipment.IRequest;
// }): Promise<IPageIShoppingMallShipment.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_shipments.findMany({
//     ...ShoppingMallShipmentAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallShipmentAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------