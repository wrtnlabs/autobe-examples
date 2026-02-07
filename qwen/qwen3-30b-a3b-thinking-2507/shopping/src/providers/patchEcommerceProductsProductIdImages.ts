import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceProductImageAtSummaryTransformer } from "../transformers/EcommerceProductImageAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceProductsProductIdImages(props: {
  productId: string;
  body: IEcommerceProductImage.IRequest;
}): Promise<IPageIEcommerceProductImage.ISummary> {
  const page = props.body.page ?? 1;
  const size = props.body.size ?? 10;
  const currentPage = Math.max(1, page);
  const pageSize = Math.min(100, Math.max(1, size));
  const skip = (currentPage - 1) * pageSize;
  const data = await MyGlobal.prisma.ecommerce_product_images.findMany({
    where: {
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
    skip,
    take: pageSize,
    orderBy: { created_at: "desc" as const },
    ...EcommerceProductImageAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_product_images.count({
    where: {
      ecommerce_product_id: props.productId,
      deleted_at: null,
    },
  });
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceProductImageAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: currentPage,
      limit: pageSize,
      records: total,
      pages: Math.ceil(total / pageSize),
    },
  };
}
