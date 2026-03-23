import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallGuest";
import { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallGuestAtSummaryTransformer } from "../transformers/ShoppingMallGuestAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallGuests(props: {
  body: IShoppingMallGuest.IRequest;
}): Promise<IPageIShoppingMallGuest.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_guestsWhereInput = {};
  if (props.body.search !== undefined) {
    whereInput.OR = [
      { device_fingerprint: { contains: props.body.search } },
      { ip: { contains: props.body.search } },
    ];
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    whereInput.created_at = {};
    if (props.body.created_at_from !== undefined) {
      whereInput.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      whereInput.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  if (props.body.include_deleted !== true) {
    whereInput.deleted_at = null;
  }
  const data = await MyGlobal.prisma.shopping_mall_guests.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ShoppingMallGuestAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_guests.count({
    where: whereInput,
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    ShoppingMallGuestAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
