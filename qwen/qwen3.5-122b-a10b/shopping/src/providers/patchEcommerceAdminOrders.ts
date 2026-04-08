import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrder";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceOrderAtSummaryTransformer } from "../transformers/EcommerceOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminOrders(props: {
  admin: AdminPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IPageIEcommerceOrder.ISummary> {
  const page = props.body.page ?? 0;
  const limit = props.body.limit ?? 100;
  if (page < 0) {
    throw new HttpException("Page must be non-negative", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }
  const offset = page * limit;
  const whereInput: Prisma.ecommerce_ordersWhereInput = {
    deleted_at: null,
    ...(props.body.status !== undefined && {
      status: props.body.status,
    }),
    ...(props.body.order_number !== undefined && {
      order_number: {
        contains: props.body.order_number,
      },
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.ecommerce_ordersWhereInput;
  const records = await MyGlobal.prisma.ecommerce_orders.findMany({
    where: whereInput,
    skip: offset,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_orders.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceOrderAtSummaryTransformer.transform,
  );
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page + 1,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceOrder.ISummary;
}
