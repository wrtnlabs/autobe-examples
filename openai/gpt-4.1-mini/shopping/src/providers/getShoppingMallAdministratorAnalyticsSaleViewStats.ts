import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleViewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleViewStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSaleViewStatTransformer } from "../transformers/ShoppingMallSaleViewStatTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorAnalyticsSaleViewStats(props: {
  administrator: AdministratorPayload;
}): Promise<IShoppingMallSaleViewStat[]> {
  const prisma = MyGlobal.prisma;
  const records = await prisma.shopping_mall_sale_view_stats.findMany({
    where: { deleted_at: null },
    ...ShoppingMallSaleViewStatTransformer.select(),
  });
  const result = await Promise.all(
    records.map((record) =>
      ShoppingMallSaleViewStatTransformer.transform(record),
    ),
  );
  return result;
}
