import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallChannelCategory";
import { IPageIShoppingMallChannelCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallChannelCategory";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";

export async function patchShoppingMallShoppingMallChannelsChannelCodeShoppingMallChannelCategories(props: {
  channelCode: string;
  body: IShoppingMallChannelCategory.IRequest;
}): Promise<IPageIShoppingMallChannelCategory.ISummary> {
  const channel = await MyGlobal.prisma.shopping_mall_channels.findUnique({
    where: { code: props.channelCode },
  });

  if (!channel) {
    throw new HttpException("Shopping mall channel not found", 404);
  }

  const page = props.body.page >= 1 ? props.body.page : 1;
  const limit =
    props.body.limit >= 1 && props.body.limit <= 100 ? props.body.limit : 20;
  const skip = (page - 1) * limit;

  const where: Prisma.shopping_mall_channel_categoriesWhereInput = {
    shopping_mall_channel_id: channel.id,
    ...(props.body.search
      ? {
          shopping_mall_product_category: {
            OR: [
              { code: { contains: props.body.search } },
              { name: { contains: props.body.search } },
            ],
          },
        }
      : {}),
  };

  const orderByArray: Prisma.shopping_mall_channel_categoriesOrderByWithRelationInput[] =
    props.body.orderBy && props.body.orderDirection
      ? [
          {
            [props.body.orderBy === "code"
              ? "shopping_mall_product_category"
              : props.body.orderBy]: props.body.orderDirection as
              | "asc"
              | "desc",
          },
        ]
      : [{ created_at: "desc" as "desc" }];

  const [items, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_channel_categories.findMany({
      where,
      skip,
      take: limit,
      orderBy: orderByArray,
    }),
    MyGlobal.prisma.shopping_mall_channel_categories.count({ where }),
  ]);

  // Extract product category ids
  const productCategoryIds = Array.from(
    new Set(items.map((item) => item.shopping_mall_product_category_id)),
  );

  // Batch query product categories
  const productCategories =
    await MyGlobal.prisma.shopping_mall_product_categories.findMany({
      where: { id: { in: productCategoryIds } },
    });

  // Map product categories by id for quick access
  const productCategoryMap = new Map(
    productCategories.map((pc) => [pc.id, pc]),
  );

  return {
    pagination: {
      current: page satisfies number as number,
      limit: limit satisfies number as number,
      records: total satisfies number as number,
      pages: Math.ceil(total / limit) satisfies number as number,
    },
    data: items.map((item) => {
      const productCategory = productCategoryMap.get(
        item.shopping_mall_product_category_id,
      );
      return {
        id: item.id satisfies string as string,
        code: productCategory?.code ?? ("" satisfies string as string),
        name: productCategory?.name ?? ("" satisfies string as string),
        created_at: item.created_at
          ? toISOStringSafe(item.created_at)
          : undefined,
      };
    }),
  } satisfies IPageIShoppingMallChannelCategory.ISummary;
}
