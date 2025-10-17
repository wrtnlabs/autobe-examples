import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import { IPageIShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentMethod";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerPaymentMethods(props: {
  customer: CustomerPayload;
  body: IShoppingMallPaymentMethod.IRequest;
}): Promise<IPageIShoppingMallPaymentMethod.ISummary> {
  const { customer, body } = props;

  const page = body.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [methods, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_methods.findMany({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_payment_methods.count({
      where: {
        shopping_mall_customer_id: customer.id,
        deleted_at: null,
      },
    }),
  ]);

  const data: IShoppingMallPaymentMethod.ISummary[] = methods.map((method) => ({
    id: method.id as string & tags.Format<"uuid">,
    payment_type: method.payment_type,
  }));

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data,
  };
}
