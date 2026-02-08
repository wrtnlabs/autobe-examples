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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSaleSpecifications(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleSpecification.IRequest;
}): Promise<IPageIShoppingMallSaleSpecification.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_specificationsWhereInput = {
    deleted_at: null,
  };
  const data = await MyGlobal.prisma.shopping_mall_sale_specifications.findMany(
    {
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    },
  );
  const total = await MyGlobal.prisma.shopping_mall_sale_specifications.count({
    where,
  });
  return {
    data: data.map((record) => ({
      id: record.id,
      shopping_mall_sale_id: record.shopping_mall_sale_id,
      specification_key: record.specification_key,
      specification_value: record.specification_value,
      created_at: toISOStringSafe(record.created_at),
      updated_at: toISOStringSafe(record.updated_at),
      deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
