import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPoints } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPoints";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerPointsPointId(props: {
  customer: CustomerPayload;
  pointId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPoints> {
  const point = await MyGlobal.prisma.shopping_mall_points.findUnique({
    where: { id: props.pointId },
  });

  if (!point) {
    throw new HttpException("Point record not found", 404);
  }

  if (point.shopping_mall_customer_id !== props.customer.id) {
    throw new HttpException("Forbidden", 403);
  }

  return {
    id: point.id,
    shopping_mall_customer_id: point.shopping_mall_customer_id,
    balance: point.balance,
    created_at: toISOStringSafe(point.created_at),
    updated_at: toISOStringSafe(point.updated_at),
    deleted_at: point.deleted_at ? toISOStringSafe(point.deleted_at) : null,
  };
}
