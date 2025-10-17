import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import { IPageIShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallAddress.IRequest;
}): Promise<IPageIShoppingMallAddress> {
  const { customer, body } = props;

  const page = body.page ?? 0;
  const limit = 20;
  const skip = page * limit;

  const [addresses, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_addresses.findMany({
      where: {
        shopping_mall_customer_id: customer.id,
        user_type: "customer",
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
      skip: skip,
      take: limit,
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        address_line1: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_addresses.count({
      where: {
        shopping_mall_customer_id: customer.id,
        user_type: "customer",
        deleted_at: null,
      },
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: addresses,
  };
}
