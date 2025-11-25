import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCoin";
import { IPageIShoppingMallCoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCoin";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminCoins(props: {
  admin: AdminPayload;
  body: IShoppingMallCoin.IRequest;
}): Promise<IPageIShoppingMallCoin.ISummary> {
  const page = props.body.page;
  const limit = props.body.limit;
  const skip = (page - 1) * limit;

  // Build where conditions with optimized balance filtering
  const where: Prisma.shopping_mall_coinsWhereInput = {
    deleted_at: null,
    actor_type: props.body.actor_type,
    coin_type: props.body.coin_type,
  };

  // Add balance range filtering if specified
  if (
    props.body.balance_min !== undefined ||
    props.body.balance_max !== undefined
  ) {
    where.balance = {};
    if (props.body.balance_min !== undefined) {
      where.balance.gte = props.body.balance_min;
    }
    if (props.body.balance_max !== undefined) {
      where.balance.lte = props.body.balance_max;
    }
  }

  // Build orderBy with direct property assignment
  const orderBy: Prisma.shopping_mall_coinsOrderByWithRelationInput = {};
  const sortField = props.body.sort_by || "created_at";
  const sortOrder = props.body.order || "desc";

  // Map API sort fields to Prisma fields
  const fieldMapping: Record<
    string,
    keyof Prisma.shopping_mall_coinsOrderByWithRelationInput
  > = {
    balance: "balance",
    created_at: "created_at",
    updated_at: "updated_at",
    actor_type: "actor_type",
    coin_type: "coin_type",
  };

  const prismaField = fieldMapping[sortField] || "created_at";
  orderBy[prismaField] = sortOrder;

  // Execute concurrent queries for data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coins.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_coins.count({ where }),
  ]);

  // Transform data to match API response format
  const transformedData = data.map((coin) => ({
    id: coin.id,
    actor_type: coin.actor_type,
    balance: coin.balance,
    coin_type: coin.coin_type,
    total_earned: coin.total_earned,
    total_spent: coin.total_spent,
    created_at: toISOStringSafe(coin.created_at),
    updated_at: toISOStringSafe(coin.updated_at),
  }));

  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: transformedData,
  };
}
