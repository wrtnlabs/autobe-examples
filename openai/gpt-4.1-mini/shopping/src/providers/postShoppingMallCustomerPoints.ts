import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerPoints(props: {
  customer: CustomerPayload;
  body: IShoppingMallPoints.ICreate;
}): Promise<IShoppingMallPoints> {
  const now = toISOStringSafe(new Date());

  const record = await MyGlobal.prisma.shopping_mall_points.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      balance: props.body.balance,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    },
  });

  return {
    id: record.id,
    shopping_mall_customer_id: record.shopping_mall_customer_id,
    balance: record.balance,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
