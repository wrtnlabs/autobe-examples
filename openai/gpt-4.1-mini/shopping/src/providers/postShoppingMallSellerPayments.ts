import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function postShoppingMallSellerPayments(props: {
  seller: SellerPayload;
  body: IShoppingMallPayment.ICreate;
}): Promise<IShoppingMallPayment> {
  const now = toISOStringSafe(new Date()) as string & tags.Format<"date-time">;

  const created = await MyGlobal.prisma.shopping_mall_payments.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      shopping_mall_order_id: props.body.shopping_mall_order_id,
      payment_method: props.body.payment_method,
      payment_status: props.body.payment_status,
      payment_amount: props.body.payment_amount,
      transaction_id: props.body.transaction_id,
      payment_date: props.body.payment_date,
      created_at: now,
      updated_at: now,
    },
  });

  return {
    id: created.id,
    shopping_mall_order_id: created.shopping_mall_order_id,
    payment_method: created.payment_method,
    payment_status: created.payment_status,
    payment_amount: created.payment_amount,
    transaction_id: created.transaction_id,
    payment_date: toISOStringSafe(created.payment_date) as string &
      tags.Format<"date-time">,
    created_at: toISOStringSafe(created.created_at) as string &
      tags.Format<"date-time">,
    updated_at: toISOStringSafe(created.updated_at) as string &
      tags.Format<"date-time">,
    deleted_at:
      created.deleted_at !== null && created.deleted_at !== undefined
        ? toISOStringSafe(created.deleted_at)
        : null,
  };
}
