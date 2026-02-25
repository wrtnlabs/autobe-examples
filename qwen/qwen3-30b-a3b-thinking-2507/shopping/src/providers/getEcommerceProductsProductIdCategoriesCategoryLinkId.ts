import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductCategoryLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductCategoryLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductCategoryLinkTransformer } from "../transformers/EcommerceProductCategoryLinkTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceProductsProductIdCategoriesCategoryLinkId(props: {
  productId: string;
  categoryLinkId: string;
}): Promise<IEcommerceProductCategoryLink> {
  const link =
    await MyGlobal.prisma.ecommerce_product_category_links.findUniqueOrThrow({
      where: {
        id: props.categoryLinkId,
        ecommerce_product_id: props.productId,
        deleted_at: null,
      },
      ...EcommerceProductCategoryLinkTransformer.select(),
    });
  return await EcommerceProductCategoryLinkTransformer.transform(link);
}
