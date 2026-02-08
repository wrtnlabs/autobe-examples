import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function patchShoppingMallSellerProducts(props: {
  seller: SellerPayload;
  body: IShoppingMallProduct.IRequest;
}): Promise<IPageIShoppingMallProduct.ISummary> {
  const page = 1;
  const limit = 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_productsWhereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  };
  const orderByInput: Prisma.shopping_mall_productsOrderByWithRelationInput = {
    created_at: "desc",
  };
  const total = await MyGlobal.prisma.shopping_mall_products.count({
    where: whereInput,
  });
  const records = await MyGlobal.prisma.shopping_mall_products.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      name: true,
      base_price: true,
      description: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      seller_id: true,
      product_subcategory_id: true,
    },
  });
  const data = records.map((record) => ({
    id: record.id,
    name: record.name,
    price: record.base_price,
    stock_quantity: 0,
    created_at: toISOStringSafe(record.created_at),
    seller: {
      id: record.seller_id,
    },
    product_subcategory: record.product_subcategory_id
      ? {
          id: record.product_subcategory_id,
          name: "",
        }
      : null,
  }));
  return {
    data,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
