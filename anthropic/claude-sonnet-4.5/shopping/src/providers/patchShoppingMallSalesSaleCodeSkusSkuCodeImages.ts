import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallSalesSaleCodeSkusSkuCodeImages(props: {
  saleCode: string;
  skuCode: string;
  body: IShoppingMallSaleImage.IRequest;
}): Promise<IPageIShoppingMallSaleImage.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findUnique({
    where: { code: props.saleCode },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const sku = await MyGlobal.prisma.shopping_mall_sale_skus.findFirst({
    where: {
      shopping_mall_sale_id: sale.id,
      sku_code: props.skuCode,
    },
  });

  if (!sku) {
    throw new HttpException("SKU not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const whereCondition: Record<string, unknown> = {
    shopping_mall_sale_id: sale.id,
  };

  if (props.body.shopping_mall_sale_sku_id !== undefined) {
    whereCondition.shopping_mall_sale_sku_id =
      props.body.shopping_mall_sale_sku_id;
  }

  if (props.body.display_order_min !== undefined) {
    whereCondition.display_order = {
      ...(typeof whereCondition.display_order === "object"
        ? whereCondition.display_order
        : {}),
      gte: props.body.display_order_min,
    };
  }

  if (props.body.display_order_max !== undefined) {
    whereCondition.display_order = {
      ...(typeof whereCondition.display_order === "object"
        ? whereCondition.display_order
        : {}),
      lte: props.body.display_order_max,
    };
  }

  if (props.body.is_primary !== undefined) {
    whereCondition.is_primary = props.body.is_primary;
  }

  if (props.body.created_at_min !== undefined) {
    whereCondition.created_at = {
      ...(typeof whereCondition.created_at === "object"
        ? whereCondition.created_at
        : {}),
      gte: new Date(props.body.created_at_min),
    };
  }

  if (props.body.created_at_max !== undefined) {
    whereCondition.created_at = {
      ...(typeof whereCondition.created_at === "object"
        ? whereCondition.created_at
        : {}),
      lte: new Date(props.body.created_at_max),
    };
  }

  if (props.body.search) {
    whereCondition.OR = [{ alt_text: { contains: props.body.search } }];
  }

  const orderBy: Record<string, string>[] = [];
  if (props.body.sort && props.body.sort.length > 0) {
    for (const sortItem of props.body.sort) {
      const direction = sortItem.startsWith("-") ? "desc" : "asc";
      const field =
        sortItem.startsWith("-") || sortItem.startsWith("+")
          ? sortItem.slice(1)
          : sortItem;
      orderBy.push({ [field]: direction });
    }
  } else {
    orderBy.push({ display_order: "asc" });
  }

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_images.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy,
    }),
    MyGlobal.prisma.shopping_mall_sale_images.count({
      where: whereCondition,
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: data.map((image) => ({
      id: image.id,
      shopping_mall_sale_id: image.shopping_mall_sale_id,
      shopping_mall_sale_sku_id: image.shopping_mall_sale_sku_id,
      url_original: image.url_original,
      url_large: image.url_large,
      url_medium: image.url_medium,
      url_small: image.url_small,
      url_thumbnail: image.url_thumbnail,
      is_primary: image.is_primary,
      display_order: image.display_order,
      alt_text: image.alt_text,
      created_at: toISOStringSafe(image.created_at),
    })),
  };
}
