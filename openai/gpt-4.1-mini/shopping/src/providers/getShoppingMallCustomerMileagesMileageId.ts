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

export async function getShoppingMallCustomerMileagesMileageId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallMileage> {
  const mileage = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: {
      id: props.mileageId,
      shopping_mall_customer_id: props.customer.id,
    },
  });

  if (mileage === null) {
    throw new HttpException("Mileage record not found", 404);
  }

  return {
    id: mileage.id,
    shopping_mall_customer_id: mileage.shopping_mall_customer_id,
    points: mileage.points,
    expiration_date:
      mileage.expiration_date === null
        ? null
        : toISOStringSafe(mileage.expiration_date),
    created_at: toISOStringSafe(mileage.created_at),
    updated_at: toISOStringSafe(mileage.updated_at),
    deleted_at:
      mileage.deleted_at === null ? null : toISOStringSafe(mileage.deleted_at),
  };
}
