import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommercePlatformCustomerProfileAtSummaryTransformer } from "../transformers/EcommercePlatformCustomerProfileAtSummaryTransformer";
import { EcommercePlatformOrderItemTransformer } from "../transformers/EcommercePlatformOrderItemTransformer";
import { EcommercePlatformShippingAddressAtSummaryTransformer } from "../transformers/EcommercePlatformShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformSellerOrdersFulfillment(props: {
  seller: SellerPayload;
  body: IEcommercePlatformOrder.IFulfillmentRequest;
}): Promise<IPageIEcommercePlatformOrder.IFulfillmentSummary> {
  const sellerProfile =
    await MyGlobal.prisma.ecommerce_platform_seller_profiles.findFirstOrThrow({
      where: { seller_id: props.seller.id },
      select: { id: true },
    });
  const whereInput = {
    items: {
      some: {
        productVariant: {
          product: {
            ecommerce_platform_seller_profile_id: sellerProfile.id,
          },
        },
      },
    },
    ...(props.body.status && { status: props.body.status }),
    ...(props.body.dateFrom && props.body.dateTo
      ? { created_at: { gte: props.body.dateFrom, lte: props.body.dateTo } }
      : props.body.dateFrom
        ? { created_at: { gte: props.body.dateFrom } }
        : props.body.dateTo
          ? { created_at: { lte: props.body.dateTo } }
          : {}),
    ...(props.body.orderNumber && {
      order_number: {
        mode: "insensitive" as const,
        contains: props.body.orderNumber,
      },
    }),
  } satisfies Prisma.ecommerce_platform_ordersWhereInput;
  const orders = await MyGlobal.prisma.ecommerce_platform_orders.findMany({
    where: whereInput,
    skip: props.body.pageOffset ?? 0,
    take: props.body.pageSize ?? 100,
    orderBy: { created_at: "desc" as const },
    select: {
      id: true,
      order_number: true,
      status: true,
      created_at: true,
      customerProfile:
        EcommercePlatformCustomerProfileAtSummaryTransformer.select(),
      shippingAddress:
        EcommercePlatformShippingAddressAtSummaryTransformer.select(),
      items: EcommercePlatformOrderItemTransformer.select(),
    },
  });
  const totalRecords = await MyGlobal.prisma.ecommerce_platform_orders.count({
    where: whereInput,
  });
  const pageOffset = props.body.pageOffset ?? 0;
  const pageSize = props.body.pageSize ?? 100;
  return {
    pagination: {
      current: Math.floor(pageOffset / pageSize) + 1,
      limit: pageSize,
      records: totalRecords,
      pages: Math.ceil(totalRecords / pageSize),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(orders, async (order) => {
      return {
        id: order.id,
        createdAt: toISOStringSafe(order.created_at),
        customerProfile:
          await EcommercePlatformCustomerProfileAtSummaryTransformer.transform(
            order.customerProfile,
          ),
        items: await ArrayUtil.asyncMap(
          order.items,
          EcommercePlatformOrderItemTransformer.transform,
        ),
        orderNumber: order.order_number,
        status: order.status,
        shippingAddress:
          await EcommercePlatformShippingAddressAtSummaryTransformer.transform(
            order.shippingAddress,
          ),
      } satisfies IEcommercePlatformOrder.IFulfillmentSummary;
    }),
  } satisfies IPageIEcommercePlatformOrder.IFulfillmentSummary;
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
// import { IEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrder";
// import { IPageIEcommercePlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerProfile";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IEcommercePlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformOrderItem";
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
// import { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
// import { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
// import { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformSellerOrdersFulfillment(props: {
//   seller: SellerPayload;
//   body: IEcommercePlatformOrder.IFulfillmentRequest;
// }): Promise<IPageIEcommercePlatformOrder.IFulfillmentSummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------