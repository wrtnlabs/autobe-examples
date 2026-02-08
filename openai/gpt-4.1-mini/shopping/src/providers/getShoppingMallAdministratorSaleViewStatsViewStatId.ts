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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSaleViewStatsViewStatId(props: {
  administrator: AdministratorPayload;
  viewStatId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleViewStat> {
  const record = await MyGlobal.prisma.shopping_mall_sale_view_stats.findUnique(
    {
      where: { id: props.viewStatId },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        view_count: true,
        unique_view_count: true,
        first_viewed_at: true,
        last_viewed_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  if (!record) {
    throw new HttpException("Sale view stat not found", 404);
  }
  return {
    id: record.id,
    shopping_mall_sale_id: record.shopping_mall_sale_id,
    view_count: record.view_count,
    unique_view_count: record.unique_view_count,
    first_viewed_at:
      record.first_viewed_at === null
        ? null
        : toISOStringSafe(record.first_viewed_at),
    last_viewed_at:
      record.last_viewed_at === null
        ? null
        : toISOStringSafe(record.last_viewed_at),
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at:
      record.deleted_at === null ? null : toISOStringSafe(record.deleted_at),
  };
}
