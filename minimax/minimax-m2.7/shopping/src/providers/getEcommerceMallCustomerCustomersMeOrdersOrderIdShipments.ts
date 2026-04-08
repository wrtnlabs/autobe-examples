import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShipmentAtInvertTransformer } from "../transformers/EcommerceMallShipmentAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallCustomerCustomersMeOrdersOrderIdShipments(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallShipment.IInvert[]> {
  // Verify the order belongs to the authenticated customer
  const order = await MyGlobal.prisma.ecommerce_mall_orders.findUniqueOrThrow({
    where: { id: props.orderId },
    select: {
      id: true,
      ecommerce_mall_customer_id: true,
    },
  });
  // Data isolation: ensure customer can only access their own orders
  if (order.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Order not found", 404);
  }
  // Fetch all shipments for this order (excluding soft-deleted)
  const shipments = await MyGlobal.prisma.ecommerce_mall_shipments.findMany({
    ...EcommerceMallShipmentAtInvertTransformer.select(),
    where: {
      ecommerce_mall_order_id: props.orderId,
      deleted_at: null,
    },
    orderBy: { created_at: "desc" },
  });
  // Return empty array if no shipments (not an error per spec)
  return await ArrayUtil.asyncMap(
    shipments,
    EcommerceMallShipmentAtInvertTransformer.transform,
  );
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
// import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
// import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
// import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
// import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerCustomersMeOrdersOrderIdShipments(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallShipment.IInvert> {
//   const record = await MyGlobal.prisma.ecommerce_mall_shipments.findFirstOrThrow({
//     ...EcommerceMallShipmentAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallShipmentAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------