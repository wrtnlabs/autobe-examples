import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfileSnapshot";
import { IShoppingMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfileSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProfileSnapshots(props: {
  body: IShoppingMallSellerProfileSnapshot.IRequest;
}): Promise<IPageIShoppingMallSellerProfileSnapshot.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const total =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.count();
  const data =
    await MyGlobal.prisma.shopping_mall_seller_profile_snapshots.findMany({
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {},
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map(() => ({})),
  };
}
