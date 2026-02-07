import { IEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCart";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCart";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceCartAtSummaryTransformer } from "../transformers/EcommerceCartAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerCarts(props: {
  customer: CustomerPayload;
  body: IEcommerceCart.IRequest;
}): Promise<IPageIEcommerceCart.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const carts = await MyGlobal.prisma.ecommerce_carts.findMany({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...EcommerceCartAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_carts.count({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  return {
    data: await ArrayUtil.asyncMap(
      carts,
      EcommerceCartAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
