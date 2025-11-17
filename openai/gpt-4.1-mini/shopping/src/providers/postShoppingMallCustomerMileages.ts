import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerMileages(props: {
  customer: CustomerPayload;
  body: IShoppingMallMileage.ICreate;
}): Promise<IShoppingMallMileage> {
  if (props.body.points <= 0) {
    throw new HttpException("Points must be a positive integer", 400);
  }

  const nowISOString = toISOStringSafe(new Date());

  const created = await MyGlobal.prisma.shopping_mall_mileages.create({
    data: {
      id: v4(),
      shopping_mall_customer_id: props.customer.id,
      points: props.body.points,
      expiration_date: props.body.expiration_date ?? null,
      created_at: nowISOString,
      updated_at: nowISOString,
    },
  });

  return {
    id: created.id,
    shopping_mall_customer_id: created.shopping_mall_customer_id,
    points: created.points,
    expiration_date: created.expiration_date
      ? toISOStringSafe(created.expiration_date)
      : null,
    created_at: toISOStringSafe(created.created_at),
    updated_at: toISOStringSafe(created.updated_at),
    deleted_at: created.deleted_at ? toISOStringSafe(created.deleted_at) : null,
  };
}
