import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformSnapshotOrderItemAtSummaryTransformer } from "../transformers/EcommercePlatformSnapshotOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommercePlatformSnapshotOrderItem.IRequest;
}): Promise<IPageIEcommercePlatformSnapshotOrderItem.ISummary> {
  const body = props.body;
  // Validate order exists
  const order =
    await MyGlobal.prisma.ecommerce_platform_orders.findUniqueOrThrow({
      where: { id: props.orderId },
      select: { id: true, ecommerce_platform_customer_profile_id: true },
    });
  // Get authenticated customer's profile
  const customerProfile =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findFirst({
      where: {
        ecommerce_platform_customer_id: props.customer.id,
        deleted_at: null,
      },
      select: { id: true },
    });
  // Verify order belongs to this customer
  if (
    customerProfile === null ||
    order.ecommerce_platform_customer_profile_id !== customerProfile.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate order item exists and belongs to this order
  const orderItem =
    await MyGlobal.prisma.ecommerce_platform_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: { id: true, ecommerce_platform_order_id: true },
    });
  if (orderItem.ecommerce_platform_order_id !== props.orderId) {
    throw new HttpException(
      "Order item does not belong to the specified order",
      404,
    );
  }
  // Determine pagination parameters
  const limit = body.limit ?? (body.cursor !== undefined ? 20 : 100);
  const page = body.page ?? 1;
  const isCursorBased = body.cursor !== undefined;
  // Build base where clause
  const baseWhere: Prisma.ecommerce_platform_snapshot_order_itemsWhereInput = {
    ecommerce_platform_order_items_id: props.itemId,
    snapshot: {
      entity_type: "order_item",
      ...(body.created_after !== undefined && {
        created_at: { gt: new Date(body.created_after) },
      }),
      ...(body.created_before !== undefined && {
        created_at: { lt: new Date(body.created_before) },
      }),
    },
  };
  // Build final where with cursor if present
  const whereInput = isCursorBased
    ? ({
        AND: [baseWhere, { id: { gt: body.cursor } }],
      } satisfies Prisma.ecommerce_platform_snapshot_order_itemsWhereInput)
    : baseWhere;
  // Query snapshot records
  const records =
    await MyGlobal.prisma.ecommerce_platform_snapshot_order_items.findMany({
      where: whereInput,
      take: limit,
      skip: isCursorBased ? 0 : (page - 1) * limit,
      orderBy: { id: "asc" },
      ...EcommercePlatformSnapshotOrderItemAtSummaryTransformer.select(),
    });
  // Count total matching records
  const total =
    await MyGlobal.prisma.ecommerce_platform_snapshot_order_items.count({
      where: baseWhere,
    });
  // Transform and return
  return {
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformSnapshotOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIEcommercePlatformSnapshotOrderItem.ISummary;
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
// import { IEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshotOrderItem";
// import { IPageIEcommercePlatformSnapshotOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformSnapshotOrderItem";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSnapshot";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerOrdersOrderIdItemsItemIdSnapshots(props: {
//   customer: CustomerPayload;
//   orderId: string & tags.Format<"uuid">;
//   itemId: string & tags.Format<"uuid">;
//   body: IEcommercePlatformSnapshotOrderItem.IRequest;
// }): Promise<IPageIEcommercePlatformSnapshotOrderItem.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_snapshot_order_items.findMany({
//     ...EcommercePlatformSnapshotOrderItemAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformSnapshotOrderItemAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------