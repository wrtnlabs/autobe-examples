import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleImage";
import { IPageIShoppingMallSaleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleImage";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function patchShoppingMallAdminSalesSaleCodeImages(props: {
  admin: AdminPayload;
  saleCode: string;
  body: IShoppingMallSaleImage.IRequest;
}): Promise<IPageIShoppingMallSaleImage.ISummary> {
  const sale = await MyGlobal.prisma.shopping_mall_sales.findFirst({
    where: {
      code: props.saleCode,
      deleted_at: null,
    },
  });

  if (!sale) {
    throw new HttpException("Sale not found", 404);
  }

  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;

  const buildSortCriteria = () => {
    if (!props.body.sort || props.body.sort.length === 0) {
      return undefined;
    }
    return props.body.sort.map((sortItem) => {
      const [field, direction] = sortItem.split(":");
      return { [field]: direction };
    });
  };

  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_sale_images.findMany({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.shopping_mall_sale_sku_id !== undefined && {
          shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
        }),
        ...(props.body.display_order_min !== undefined ||
        props.body.display_order_max !== undefined
          ? {
              display_order: {
                ...(props.body.display_order_min !== undefined && {
                  gte: props.body.display_order_min,
                }),
                ...(props.body.display_order_max !== undefined && {
                  lte: props.body.display_order_max,
                }),
              },
            }
          : {}),
        ...(props.body.is_primary !== undefined && {
          is_primary: props.body.is_primary,
        }),
        ...(props.body.created_at_min !== undefined ||
        props.body.created_at_max !== undefined
          ? {
              created_at: {
                ...(props.body.created_at_min !== undefined && {
                  gte: new Date(props.body.created_at_min),
                }),
                ...(props.body.created_at_max !== undefined && {
                  lte: new Date(props.body.created_at_max),
                }),
              },
            }
          : {}),
        ...(props.body.search && {
          OR: [{ alt_text: { contains: props.body.search } }],
        }),
      },
      orderBy: buildSortCriteria(),
      skip,
      take: limit,
    }),
    MyGlobal.prisma.shopping_mall_sale_images.count({
      where: {
        shopping_mall_sale_id: sale.id,
        ...(props.body.shopping_mall_sale_sku_id !== undefined && {
          shopping_mall_sale_sku_id: props.body.shopping_mall_sale_sku_id,
        }),
        ...(props.body.display_order_min !== undefined ||
        props.body.display_order_max !== undefined
          ? {
              display_order: {
                ...(props.body.display_order_min !== undefined && {
                  gte: props.body.display_order_min,
                }),
                ...(props.body.display_order_max !== undefined && {
                  lte: props.body.display_order_max,
                }),
              },
            }
          : {}),
        ...(props.body.is_primary !== undefined && {
          is_primary: props.body.is_primary,
        }),
        ...(props.body.created_at_min !== undefined ||
        props.body.created_at_max !== undefined
          ? {
              created_at: {
                ...(props.body.created_at_min !== undefined && {
                  gte: new Date(props.body.created_at_min),
                }),
                ...(props.body.created_at_max !== undefined && {
                  lte: new Date(props.body.created_at_max),
                }),
              },
            }
          : {}),
        ...(props.body.search && {
          OR: [{ alt_text: { contains: props.body.search } }],
        }),
      },
    }),
  ]);

  return {
    pagination: {
      current: page,
      limit: limit,
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
      alt_text: image.alt_text ?? undefined,
      created_at: toISOStringSafe(image.created_at),
    })),
  };
}
