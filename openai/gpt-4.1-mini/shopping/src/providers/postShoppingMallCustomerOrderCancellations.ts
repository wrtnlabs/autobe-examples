import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallOrderCancellation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellation";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function postShoppingMallCustomerOrderCancellations(props: {
  customer: CustomerPayload;
  body: IShoppingMallOrderCancellation.ICreate;
}): Promise<IShoppingMallOrderCancellation> {
  await MyGlobal.prisma.shopping_mall_order_cancellations.create({
    data: {
      id: v4(),
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      cancellation_reason: props.body.cancellation_reason,
      cancellation_status: "pending",
      requested_at: props.body.requested_at,
      processed_at: null,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });

  return typia.random<IShoppingMallOrderCancellation>();
}
