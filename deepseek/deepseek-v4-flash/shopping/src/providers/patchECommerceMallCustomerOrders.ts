import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallOrderAtSummaryTransformer } from "../transformers/ECommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerOrders(props: {
  customer: CustomerPayload;
  body: IECommerceMallOrder.IRequest;
}): Promise<IPageIECommerceMallOrder.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_ordersWhereInput = {
    e_commerce_mall_customer_id: props.customer.id satisfies string,
  };
  if (props.body.search !== undefined && props.body.search !== null) {
    where.code = { contains: props.body.search } satisfies Prisma.StringFilter;
  }
  if (props.body.start_date !== undefined && props.body.start_date !== null) {
    where.created_at = {
      ...((where.created_at as Record<string, string>) ?? {}),
      gte: props.body.start_date satisfies string,
    } satisfies Record<string, string>;
  }
  if (props.body.end_date !== undefined && props.body.end_date !== null) {
    where.created_at = {
      ...((where.created_at as Record<string, string>) ?? {}),
      lte: props.body.end_date satisfies string,
    } satisfies Record<string, string>;
  }
  const hasStatus: boolean =
    props.body.status !== undefined && props.body.status !== null;
  if (hasStatus) {
    const allOrders = await MyGlobal.prisma.e_commerce_mall_orders.findMany({
      where,
      select: {
        id: true,
        orderItems: {
          select: { status: true },
        } satisfies Prisma.e_commerce_mall_order_itemsFindManyArgs,
      },
    });
    const filteredIds: string[] = allOrders
      .filter((order) => {
        const statuses: string[] = order.orderItems.map(
          (item: { status: string }) => item.status,
        );
        return computeOrderStatus(statuses) === props.body.status;
      })
      .map((order: { id: string }) => order.id);
    const total: number = filteredIds.length;
    const paginatedIds: string[] = filteredIds.slice(skip, skip + limit);
    if (paginatedIds.length === 0) {
      return {
        pagination: {
          current: page,
          limit,
          records: total,
          pages: total === 0 ? 0 : Math.ceil(total / limit),
        } satisfies IPage.IPagination,
        data: [],
      } satisfies IPageIECommerceMallOrder.ISummary;
    }
    const records = await MyGlobal.prisma.e_commerce_mall_orders.findMany({
      where: { id: { in: paginatedIds } },
      ...ECommerceMallOrderAtSummaryTransformer.select(),
      orderBy: { created_at: "desc" satisfies "desc" },
    });
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      } satisfies IPage.IPagination,
      data: await ArrayUtil.asyncMap(
        records,
        ECommerceMallOrderAtSummaryTransformer.transform,
      ),
    } satisfies IPageIECommerceMallOrder.ISummary;
  }
  const total: number = await MyGlobal.prisma.e_commerce_mall_orders.count({
    where,
  });
  const found = await MyGlobal.prisma.e_commerce_mall_orders.findMany({
    where,
    ...ECommerceMallOrderAtSummaryTransformer.select(),
    skip,
    take: limit,
    orderBy: { created_at: "desc" satisfies "desc" },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      found,
      ECommerceMallOrderAtSummaryTransformer.transform,
    ),
  } satisfies IPageIECommerceMallOrder.ISummary;
}
function computeOrderStatus(statuses: string[]): string {
  if (statuses.length === 0) {
    return "paid";
  }
  const uniqueStatuses: Set<string> = new Set(statuses);
  if (uniqueStatuses.size === 1) {
    return statuses[0];
  }
  const terminalStates: string[] = ["delivered", "cancelled", "refunded"];
  const allTerminal: boolean = statuses.every((s) =>
    terminalStates.includes(s),
  );
  if (allTerminal) {
    return "partially_completed";
  }
  const hasShipped: boolean = statuses.some((s) => s === "shipped");
  const hasDelivered: boolean = statuses.some((s) => s === "delivered");
  if (hasShipped && !hasDelivered) {
    return "shipped";
  }
  return "partially_completed";
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
// import { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
// import { IPageIECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallOrder";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerOrders(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallOrder.IRequest;
// }): Promise<IPageIECommerceMallOrder.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_orders.findMany({
//     ...ECommerceMallOrderAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallOrderAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------