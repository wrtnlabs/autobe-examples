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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorSaleUnits(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleUnit.IRequest;
}): Promise<IPageIShoppingMallSaleUnit.ISummary> {
  const page = 1;
  const limit = 20;
  const skip = (page - 1) * limit;
  try {
    const where: {
      deleted_at: null;
    } = {
      deleted_at: null,
    };
    // As props.body properties like sku_code, option_values, etc. do not exist,
    // cannot add filters.
    // No explicit casting needed since no date fields used for filters
    const orderBy: Prisma.shopping_mall_sale_unitsOrderByWithRelationInput = {
      created_at: "desc",
    };
    const saleUnits = await MyGlobal.prisma.shopping_mall_sale_units.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    });
    const total = await MyGlobal.prisma.shopping_mall_sale_units.count({
      where,
    });
    const data = saleUnits.map(() => ({}));
    return {
      pagination: {
        current: page,
        limit,
        records: total,
        pages: Math.ceil(total / limit),
      },
      data,
    };
  } catch (error) {
    throw new HttpException(
      `Failed to retrieve sale units: ${(error as Error).message}`,
      500,
    );
  }
}
