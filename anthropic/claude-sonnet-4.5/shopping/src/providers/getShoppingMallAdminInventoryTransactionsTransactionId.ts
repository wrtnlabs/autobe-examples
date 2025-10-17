import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminInventoryTransactionsTransactionId(props: {
  admin: AdminPayload;
  transactionId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallInventoryTransaction> {
  const { transactionId } = props;

  const transaction =
    await MyGlobal.prisma.shopping_mall_inventory_transactions.findUniqueOrThrow(
      {
        where: {
          id: transactionId,
        },
        select: {
          id: true,
          transaction_type: true,
        },
      },
    );

  return {
    id: transaction.id as string & tags.Format<"uuid">,
    transaction_type: transaction.transaction_type,
  };
}
