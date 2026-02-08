import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleUnit";
import { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
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

export async function patchShoppingMallCustomerSaleUnits(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleUnit.IRequest;
}): Promise<IPageIShoppingMallSaleUnit.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput = {} satisfies Prisma.shopping_mall_sale_unitsWhereInput;
  const data = await MyGlobal.prisma.shopping_mall_sale_units.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_units.count({
    where: whereInput,
  });
  return {
    data: data.map(() => ({})),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
