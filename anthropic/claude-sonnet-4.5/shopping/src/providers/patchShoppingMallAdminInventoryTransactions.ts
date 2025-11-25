import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryTransaction";
import { IPageIShoppingMallInventoryTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminInventoryTransactions(props: {
  admin: AdminPayload;
  body: IShoppingMallInventoryTransaction.IRequest;
}): Promise<IPageIShoppingMallInventoryTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    ...(props.body.shopping_mall_sale_sku_id && {
      shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
    }),
    ...(props.body.transaction_type && {
      transaction_type: props.body.transaction_type,
    }),
    ...(() => {
      if (!props.body.from_date && !props.body.to_date) return {};
      return {
        created_at: {
          ...(props.body.from_date && { gte: new Date(props.body.from_date) }),
          ...(props.body.to_date && { lte: new Date(props.body.to_date) }),
        },
      };
    })(),
  };

  const orderBy = (() => {
    const sortBy = props.body.sort_by ?? "created_at";
    const sortOrder = props.body.sort_order ?? "desc";
    return { [sortBy]: sortOrder };
  })();

  const [transactions, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_transactions.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_inventory_transactions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transactions.map((transaction) => ({
      id: transaction.id,
      shopping_mall_sale_sku_id: transaction.shopping_mall_sale_sku_id,
      transaction_type: transaction.transaction_type,
      quantity_change: transaction.quantity_change,
      new_quantity: transaction.new_quantity,
      created_at: toISOStringSafe(transaction.created_at),
    })),
  };
}
