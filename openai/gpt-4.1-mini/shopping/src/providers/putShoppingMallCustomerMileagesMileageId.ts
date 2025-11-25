import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function putShoppingMallCustomerMileagesMileageId(props: {
  customer: CustomerPayload;
  mileageId: string & tags.Format<"uuid">;
  body: IShoppingMallMileage.IUpdate;
}): Promise<IShoppingMallMileage> {
  const existing = await MyGlobal.prisma.shopping_mall_mileages.findUnique({
    where: { id: props.mileageId },
  });

  if (!existing || existing.deleted_at !== null) {
    throw new HttpException("Mileage record not found", 404);
  }

  if (existing.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return await MyGlobal.prisma.shopping_mall_mileages
    .update({
      where: { id: props.mileageId },
      data: {
        ...("points" in props.body && props.body.points !== undefined
          ? { points: props.body.points }
          : {}),
        ...("expiration_date" in props.body &&
        props.body.expiration_date !== undefined
          ? { expiration_date: props.body.expiration_date }
          : {}),
        updated_at: toISOStringSafe(new Date()),
      },
    })
    .then((updated) => ({
      id: updated.id,
      shopping_mall_customer_id: updated.shopping_mall_customer_id,
      points: updated.points,
      expiration_date:
        updated.expiration_date === null
          ? null
          : toISOStringSafe(updated.expiration_date ?? undefined),
      created_at: toISOStringSafe(updated.created_at),
      updated_at: toISOStringSafe(updated.updated_at),
      deleted_at:
        updated.deleted_at === null
          ? null
          : toISOStringSafe(updated.deleted_at ?? undefined),
    }));
}
