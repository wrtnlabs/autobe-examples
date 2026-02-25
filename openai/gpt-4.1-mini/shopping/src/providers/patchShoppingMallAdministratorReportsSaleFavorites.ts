import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleFavorite";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import { IShoppingMallSaleFavorite } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleFavorite";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSaleFavoriteAtSummaryTransformer } from "../transformers/ShoppingMallSaleFavoriteAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorReportsSaleFavorites(props: {
  administrator: AdministratorPayload;
  body: IShoppingMallSaleFavorite.IRequest;
}): Promise<IPageIShoppingMallSaleFavorite.ISummary> {
  const page = props.body.page && props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit && props.body.limit >= 1 && props.body.limit <= 100
      ? props.body.limit
      : 20;
  const skip = (page - 1) * limit;
  const where: Prisma.shopping_mall_sale_favoritesWhereInput = {
    deleted_at: null,
    ...(props.body.saleId ? { shopping_mall_sale_id: props.body.saleId } : {}),
    ...(props.body.customerId
      ? { shopping_mall_customer_id: props.body.customerId }
      : {}),
  };
  if (props.body.search) {
    const search = props.body.search.trim();
    if (search.length > 0) {
      where.OR = [
        { customer: { email: { contains: search, mode: "insensitive" } } },
        { sale: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
  }
  const orderByField = props.body.sort ?? "created_at";
  const orderBy: Prisma.shopping_mall_sale_favoritesOrderByWithRelationInput = {
    [orderByField]: "desc",
  };
  const dataRaw = await MyGlobal.prisma.shopping_mall_sale_favorites.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ShoppingMallSaleFavoriteAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_sale_favorites.count({
    where,
  });
  const data = await Promise.all(
    dataRaw.map(ShoppingMallSaleFavoriteAtSummaryTransformer.transform),
  );
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
