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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceOrderAtSummaryTransformer } from "../transformers/EcommerceOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerOrdersHistory(props: {
  customer: CustomerPayload;
  body: IEcommerceOrder.IRequest;
}): Promise<IPageIEcommerceOrder.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.created_after !== undefined &&
      props.body.created_after !== null && {
        created_at: { gte: new Date(props.body.created_after) },
      }),
    ...(props.body.created_before !== undefined &&
      props.body.created_before !== null && {
        created_at: { lte: new Date(props.body.created_before) },
      }),
    ...(props.body.customer_id !== undefined && {
      customer_id: props.body.customer_id,
    }),
  } satisfies Prisma.ecommerce_ordersWhereInput;
  const data = await MyGlobal.prisma.ecommerce_orders.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...EcommerceOrderAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_orders.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceOrderAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
