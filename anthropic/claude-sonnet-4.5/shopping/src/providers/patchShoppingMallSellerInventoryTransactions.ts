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
import { SellerPayload } from "../decorators/payload/SellerPayload";

export async function patchShoppingMallSellerInventoryTransactions(props: {
  seller: SellerPayload;
  body: IShoppingMallInventoryTransaction.IRequest;
}): Promise<IPageIShoppingMallInventoryTransaction.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_sale_sku: {
      shopping_mall_sale: {
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  };

  if (
    props.body.shopping_mall_sale_sku_id !== undefined &&
    props.body.shopping_mall_sale_sku_id !== null
  ) {
    whereCondition.shopping_mall_sale_sku_id =
      props.body.shopping_mall_sale_sku_id;
  }

  if (
    props.body.transaction_type !== undefined &&
    props.body.transaction_type !== null
  ) {
    whereCondition.transaction_type = props.body.transaction_type;
  }

  if (
    (props.body.from_date !== undefined && props.body.from_date !== null) ||
    (props.body.to_date !== undefined && props.body.to_date !== null)
  ) {
    const dateCondition: Record<string, unknown> = {};
    if (props.body.from_date !== undefined && props.body.from_date !== null) {
      dateCondition.gte = new Date(props.body.from_date);
    }
    if (props.body.to_date !== undefined && props.body.to_date !== null) {
      dateCondition.lte = new Date(props.body.to_date);
    }
    whereCondition.created_at = dateCondition;
  }

  const sortBy = props.body.sort_by ?? "created_at";
  const sortOrder = props.body.sort_order ?? "desc";

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_inventory_transactions.findMany({
      where: whereCondition,
      skip: skip,
      take: limit,
      orderBy: {
        [sortBy]: sortOrder,
      },
    }),
    MyGlobal.prisma.shopping_mall_inventory_transactions.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((transaction) => ({
      id: transaction.id,
      shopping_mall_sale_sku_id: transaction.shopping_mall_sale_sku_id,
      transaction_type: transaction.transaction_type,
      quantity_change: transaction.quantity_change,
      new_quantity: transaction.new_quantity,
      created_at: toISOStringSafe(transaction.created_at),
    })),
  };
}
