import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSpecification";
import { IShoppingMallSaleSpecification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSpecification";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerSaleSpecifications(props: {
  seller: SellerPayload;
  body: IShoppingMallSaleSpecification.IRequest;
}): Promise<IPageIShoppingMallSaleSpecification.ISummary> {
  const page = 1;
  const limit = 100;
  if (page < 1) {
    throw new HttpException("Page must be at least 1", 400);
  }
  if (limit < 1 || limit > 1000) {
    throw new HttpException("Limit must be between 1 and 1000", 400);
  }
  const where = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_specifications.findMany(
    {
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        specification_key: true,
        specification_value: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_specifications.count({
    where,
  });
  return {
    data: data.map((item) => ({
      id: item.id,
      specification_key: item.specification_key,
      specification_value: item.specification_value,
      created_at: toISOStringSafe(item.created_at),
      updated_at: toISOStringSafe(item.updated_at),
      deleted_at:
        item.deleted_at === null ? undefined : toISOStringSafe(item.deleted_at),
    })),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
