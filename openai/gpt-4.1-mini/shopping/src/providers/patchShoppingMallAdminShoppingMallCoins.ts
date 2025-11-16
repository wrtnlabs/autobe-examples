import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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

export async function patchShoppingMallAdminShoppingMallCoins(props: {
  admin: AdminPayload;
  body: IShoppingMallCoin.IRequest;
}): Promise<IPageIShoppingMallCoin.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
  } as const;

  if (props.body.search) {
    Object.assign(whereCondition, {
      OR: [{ shopping_mall_customer_id: { contains: props.body.search } }],
    });
  }

  const orderByCondition = props.body.orderBy
    ? ({
        [props.body.orderBy]: props.body.orderDirection ?? "asc",
      } satisfies { [key: string]: "asc" | "desc" } as {
        [key: string]: "asc" | "desc";
      })
    : ({ created_at: "desc" } satisfies { created_at: "desc" } as {
        created_at: "desc";
      });

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_coins.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByCondition,
    }),
    MyGlobal.prisma.shopping_mall_coins.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((coin) => ({
      shopping_mall_channel_id: coin.shopping_mall_channel_id,
      shopping_mall_customer_id: coin.shopping_mall_customer_id,
      amount: coin.amount,
      created_at: toISOStringSafe(coin.created_at),
      updated_at: toISOStringSafe(coin.updated_at),
      deleted_at: coin.deleted_at ? toISOStringSafe(coin.deleted_at) : null,
    })),
  };
}
