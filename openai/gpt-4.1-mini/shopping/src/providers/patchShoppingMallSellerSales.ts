import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSale";
import { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
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

export async function patchShoppingMallSellerSales(props: {
  seller: SellerPayload;
  body: IShoppingMallSale.IRequest;
}): Promise<IPageIShoppingMallSale.ISummary> {
  const pageValue = 1 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const limitValue = 20 as number & tags.Type<"int32"> & tags.Minimum<0>;
  const skipValue = (pageValue - 1) * limitValue;
  const whereInput = {
    seller_id: props.seller.id,
    deleted_at: null,
  } satisfies Prisma.shopping_mall_salesWhereInput;
  const sales = await MyGlobal.prisma.shopping_mall_sales.findMany({
    where: whereInput,
    skip: skipValue,
    take: limitValue,
    orderBy: { created_at: "desc" },
    select: {
      id: true,
      name: true,
      base_price: true,
      seller_id: true,
      category: {
        select: {
          name: true,
        },
      },
      images: {
        take: 1,
        orderBy: { display_order: "asc" },
        select: {
          image_url: true,
        },
      },
    },
  });
  const totalCount = await MyGlobal.prisma.shopping_mall_sales.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: pageValue,
      limit: limitValue,
      records: totalCount as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(totalCount / limitValue) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
    data: sales.map((sale) => ({
      id: sale.id as string & tags.Format<"uuid">,
      name: sale.name,
      base_price: sale.base_price,
      seller_id: sale.seller_id as string & tags.Format<"uuid">,
      category_name: sale.category ? sale.category.name : null,
      thumbnail_url: sale.images.length > 0 ? sale.images[0].image_url : null,
    })),
  };
}
