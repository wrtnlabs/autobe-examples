import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
}): Promise<IPageIShoppingMallInventoryTransaction> {
  const { body } = props;

  const page = (body.page ?? 1) as number;
  const limit = (body.limit ?? 10) as number;
  const skip = (page - 1) * limit;

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_transactions.findMany({
      where: {
        ...(body.transaction_type !== undefined &&
          body.transaction_type !== null && {
            transaction_type: body.transaction_type,
          }),
        ...(body.transaction_status !== undefined &&
          body.transaction_status !== null && {
            transaction_status: body.transaction_status,
          }),
      },
      orderBy: {
        created_at: "desc",
      },
      skip: skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_inventory_transactions.count({
      where: {
        ...(body.transaction_type !== undefined &&
          body.transaction_type !== null && {
            transaction_type: body.transaction_type,
          }),
        ...(body.transaction_status !== undefined &&
          body.transaction_status !== null && {
            transaction_status: body.transaction_status,
          }),
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
    data: data.map((transaction) => ({
      id: transaction.id as string & tags.Format<"uuid">,
      transaction_type: transaction.transaction_type,
    })),
  };
}
