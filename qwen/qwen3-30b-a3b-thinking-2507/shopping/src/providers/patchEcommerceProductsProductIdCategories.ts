import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceCategoryAtSummaryTransformer } from "../transformers/EcommerceCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdCategories(props: {
  productId: string & tags.Format<"uuid">;
  body: IEcommerceCategory.IRequest;
}): Promise<IPageIEcommerceCategory.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 12;
  const skip = (page - 1) * limit;
  const categoryLinks =
    await MyGlobal.prisma.ecommerce_product_category_links.findMany({
      where: { ecommerce_product_id: props.productId },
      include: {
        category: EcommerceCategoryAtSummaryTransformer.select(),
      },
      orderBy: { order: "asc" },
      skip,
      take: limit,
    });
  const total = await MyGlobal.prisma.ecommerce_product_category_links.count({
    where: { ecommerce_product_id: props.productId },
  });
  const data = await ArrayUtil.asyncMap(categoryLinks, (link) =>
    EcommerceCategoryAtSummaryTransformer.transform(link.category),
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
