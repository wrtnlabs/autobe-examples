import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSearchIndex";
import { IPageIShoppingMallProductSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSearchIndex";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";

export async function patchShoppingMallCustomerProductSearchIndex(props: {
  customer: CustomerPayload;
  body: IShoppingMallProductSearchIndex.IRequest;
}): Promise<IPageIShoppingMallProductSearchIndex.ISummary> {
  const { body } = props;
  const page = body.page;
  const limit = body.limit;
  const skip = (page - 1) * limit;

  const whereCondition = {
    deleted_at: null,
    ...(body.keyword.length > 0
      ? { search_text: { contains: body.keyword } }
      : {}),
  };

  const [data, records] = await Promise.all([
    MyGlobal.prisma.shopping_mall_product_search_index.findMany({
      where: whereCondition,
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_product_search_index.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: Number(page),
      limit: Number(limit),
      records: records,
      pages: Math.ceil(records / limit),
    },
    data: data.map((entry) => ({
      id: entry.id,
      product_id: entry.product_id,
      sku_id: entry.sku_id === null ? undefined : entry.sku_id,
      search_text: entry.search_text,
    })),
  };
}
