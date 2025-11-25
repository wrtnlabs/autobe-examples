import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";

export async function patchShoppingMallProductsProductIdTags(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIShoppingMallProductTag> {
  const { productId } = props;

  // Find all tag_ids associated with this product
  const taggedProducts =
    await MyGlobal.prisma.shopping_mall_product_tags_products.findMany({
      where: { shopping_mall_product_id: productId },
      select: { shopping_mall_product_tag_id: true },
    });

  if (!taggedProducts || taggedProducts.length === 0) {
    return {
      data: [],
      pagination: {
        current: 1,
        limit: 100,
        records: 0,
        pages: 0,
      },
    };
  }

  // Extract tag IDs
  const tagIds = taggedProducts.map(
    (item) => item.shopping_mall_product_tag_id,
  );

  // Fetch full tag details for these IDs
  const tags = await MyGlobal.prisma.shopping_mall_product_tags.findMany({
    where: { id: { in: tagIds } },
    orderBy: { display_order: "asc" },
  });

  // Construct array of IShoppingMallProductTag objects with explicit property mapping
  const taggedProductsResult: IShoppingMallProductTag[] = tags.map(
    (tag) => tag.id satisfies string as string,
  );

  // Return paginated result
  return {
    data: taggedProductsResult,
    pagination: {
      current: 1,
      limit: 100,
      records: tags.length,
      pages: Math.ceil(tags.length / 100),
    },
  };
}
