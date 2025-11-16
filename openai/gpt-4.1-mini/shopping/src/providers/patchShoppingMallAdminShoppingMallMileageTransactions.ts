import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMileageTransaction";
import { IPageIShoppingMallMileageTransaction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallMileageTransaction";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminShoppingMallMileageTransactions(props: {
  admin: AdminPayload;
  body: IShoppingMallMileageTransaction.IRequest;
}): Promise<IPageIShoppingMallMileageTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  if (page < 1) {
    throw new HttpException("Page number must be greater than 0", 400);
  }
  if (limit < 1 || limit > 100) {
    throw new HttpException("Limit must be between 1 and 100", 400);
  }

  const skip = (page - 1) * limit;

  const whereConditions = {
    deleted_at: null as null | undefined,
    ...(props.body.customer_id === null
      ? {}
      : { shopping_mall_customer_id: props.body.customer_id ?? undefined }),
    ...(props.body.transaction_type === null
      ? {}
      : { type: props.body.transaction_type ?? undefined }),
    ...(props.body.start_date || props.body.end_date
      ? {
          created_at: {
            ...(props.body.start_date ? { gte: props.body.start_date } : {}),
            ...(props.body.end_date ? { lte: props.body.end_date } : {}),
          },
        }
      : {}),
  };

  let orderBy;
  switch (props.body.sort_by ?? "date") {
    case "date":
      orderBy = "created_at";
      break;
    case "amount":
      orderBy = "amount";
      break;
    default:
      orderBy = "created_at";
      break;
  }

  const orderDirection = props.body.order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_mileage_transactions.findMany({
      where: whereConditions,
      orderBy: { [orderBy]: orderDirection },
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_mileage_transactions.count({
      where: whereConditions,
    }),
  ]);

  return {
    data: data.map((transaction) => ({
      shopping_mall_customer_id: transaction.shopping_mall_customer_id,
      type: transaction.type,
      amount: transaction.amount,
      memo: transaction.memo ?? null,
      created_at: toISOStringSafe(transaction.created_at),
      updated_at: toISOStringSafe(transaction.updated_at),
    })),
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
