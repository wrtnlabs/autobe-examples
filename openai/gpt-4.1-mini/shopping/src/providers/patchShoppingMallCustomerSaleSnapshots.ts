import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
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

export async function patchShoppingMallCustomerSaleSnapshots(props: {
  customer: CustomerPayload;
  body: IShoppingMallSaleSnapshot.IRequest;
}): Promise<IPageIShoppingMallSaleSnapshot.ISummary> {
  // Since props.body.page and props.body.limit do not exist on IRequest type, assign default paging
  const page = 1;
  const limit = 100;
  if (!Number.isInteger(page) || page < 1) {
    throw new HttpException("Invalid page parameter", 400);
  }
  if (!Number.isInteger(limit) || limit < 1) {
    throw new HttpException("Invalid limit parameter", 400);
  }
  const skip = (page - 1) * limit;
  const dataRaw = await MyGlobal.prisma.shopping_mall_sale_snapshots.findMany({
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  // Convert created_at from Date to string using toISOStringSafe
  const data = dataRaw.map((item) => ({
    ...item,
    created_at: toISOStringSafe(item.created_at),
  }));
  const total = await MyGlobal.prisma.shopping_mall_sale_snapshots.count();
  return {
    data,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
