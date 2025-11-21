import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallLoyaltyPointTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallLoyaltyPointTransaction";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function getShoppingMallCustomerPromotionsLoyaltyPointsLoyaltyPointId(props: {
  customer: CustomerPayload;
  loyaltyPointId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallLoyaltyPointTransaction> {
  const transaction =
    await MyGlobal.prisma.shopping_mall_loyalty_point_transactions.findUnique({
      where: {
        id: props.loyaltyPointId,
        customer_id: props.customer.id,
        deleted_at: null,
        status: "completed",
      },
    });

  if (!transaction) {
    throw new HttpException(
      "Loyalty point transaction not found or inaccessible",
      404,
    );
  }

  return {
    id: transaction.id,
    customer_id: transaction.customer_id,
    order_id: transaction.order_id === null ? undefined : transaction.order_id,
    promotion_id:
      transaction.promotion_id === null ? undefined : transaction.promotion_id,
    points: transaction.points,
    transaction_type: transaction.transaction_type,
    status: transaction.status satisfies string as
      | "completed"
      | "pending"
      | "reversed",
    description:
      transaction.description !== null ? transaction.description : undefined,
    created_at: toISOStringSafe(transaction.created_at),
    updated_at:
      transaction.updated_at === null
        ? undefined
        : toISOStringSafe(transaction.updated_at),
    deleted_at:
      transaction.deleted_at === null
        ? undefined
        : toISOStringSafe(transaction.deleted_at),
  };
}
