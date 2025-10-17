import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";

export async function getShoppingMallPaymentTransactionsTransactionId(props: {
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallPaymentTransaction> {
  const { transactionId } = props;

  const transaction =
    await MyGlobal.prisma.shopping_mall_payment_transactions.findUniqueOrThrow({
      where: {
        id: transactionId,
      },
      select: {
        id: true,
        amount: true,
        status: true,
      },
    });

  return {
    id: transaction.id as string & tags.Format<"uuid">,
    amount: transaction.amount,
    status: transaction.status,
  };
}
