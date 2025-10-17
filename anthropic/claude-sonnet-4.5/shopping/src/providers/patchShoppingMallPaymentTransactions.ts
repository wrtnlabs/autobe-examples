import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentTransaction";
import { IPageIShoppingMallPaymentTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallPaymentTransactions(props: {
  body: IShoppingMallPaymentTransaction.IRequest;
}): Promise<IPageIShoppingMallPaymentTransaction.ISummary> {
  const { body } = props;

  const page = body.page ?? 1;
  const limit = 20;
  const skip = (page - 1) * limit;

  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_payment_transactions.findMany({
      where: {
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_payment_transactions.count({
      where: {
        deleted_at: null,
      },
    }),
  ]);

  const pages = Math.ceil(total / limit);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: total,
      pages: pages,
    },
    data: transactions.map((transaction) => ({
      id: transaction.id,
      amount: transaction.amount,
    })),
  };
}
