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

export async function getShoppingMallAdministratorSalesSaleIdViewStats(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleViewStat> {
  const record =
    await MyGlobal.prisma.shopping_mall_sale_view_stats.findUniqueOrThrow({
      where: { id: props.saleId },
      ...ShoppingMallSaleViewStatTransformer.select(),
    });
  const transformed =
    await ShoppingMallSaleViewStatTransformer.transform(record);
  const fixedResult: IShoppingMallSaleViewStat = {
    ...transformed,
    createdAt: toISOStringSafe(transformed.createdAt),
    updatedAt: toISOStringSafe(transformed.updatedAt),
    deletedAt: transformed.deletedAt
      ? toISOStringSafe(transformed.deletedAt)
      : null,
    firstViewedAt: toISOStringSafe(transformed.firstViewedAt),
    lastViewedAt: toISOStringSafe(transformed.lastViewedAt),
  };
  return fixedResult;
}
