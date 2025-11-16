import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPlatformCommissions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommissions";
import { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminOrdersOrderIdPlatformCommissions(props: {
  admin: AdminPayload;
  orderId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPlatformCommissions> {
  const commissions =
    await MyGlobal.prisma.shopping_mall_platform_commissions.findMany({
      where: {
        shopping_mall_order_id: props.orderId,
      },
    });

  return {
    data: commissions.map((commission) => ({
      id: commission.id,
      shopping_mall_payment_transaction_id:
        commission.shopping_mall_payment_transaction_id,
      shopping_mall_order_id: commission.shopping_mall_order_id,
      shopping_mall_seller_id: commission.shopping_mall_seller_id,
      order_subtotal: commission.order_subtotal,
      commission_rate: commission.commission_rate,
      commission_amount: commission.commission_amount,
      currency: commission.currency,
      commission_type: commission.commission_type,
      is_refunded: commission.is_refunded,
      refunded_amount: commission.refunded_amount,
      created_at: toISOStringSafe(commission.created_at),
    })),
  };
}
