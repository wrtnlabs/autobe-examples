import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallRefund } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefund";

export async function getShoppingMallRefundsRefundId(props: {
  refundId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallRefund> {
  const { refundId } = props;

  const refund = await MyGlobal.prisma.shopping_mall_refunds.findUniqueOrThrow({
    where: { id: refundId },
    select: {
      id: true,
      refund_amount: true,
      status: true,
    },
  });

  return {
    id: refund.id,
    refund_amount: refund.refund_amount,
    status: refund.status,
  };
}
