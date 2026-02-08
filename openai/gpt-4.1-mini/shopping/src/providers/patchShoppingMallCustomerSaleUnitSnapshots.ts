import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnitSnapshot";
import { IShoppingMallSaleUnitSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnitSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerSaleUnitSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleUnitSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleUnitSnapshot.ISummary> {
  const limit = 100;
  const orderBy: {
    created_at?: Prisma.SortOrder;
    sku_code?: Prisma.SortOrder;
  }[] = [{ created_at: "desc" }, { sku_code: "asc" }];
  const data = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.findMany(
    {
      take: limit,
      orderBy,
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_unit_snapshots.count();
  return {
    data: data.map(() => ({})),
    pagination: {
      current: 1,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
