import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallProductImageAtProtocolTransformer } from "../transformers/EcommerceMallProductImageAtProtocolTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallProductsProductIdImages(props: {
  productId: string & tags.Format<"uuid">;
}): Promise<IPageIEcommerceMallProductImage.IProtocol> {
  // Query product images ordered by display_order ascending
  const images = await MyGlobal.prisma.ecommerce_mall_product_images.findMany({
    where: { product_id: props.productId },
    orderBy: { display_order: "asc" },
    ...EcommerceMallProductImageAtProtocolTransformer.select(),
  });
  // Transform each image record to DTO
  const data = await ArrayUtil.asyncMap(
    images,
    EcommerceMallProductImageAtProtocolTransformer.transform,
  );
  // Return paginated response
  return {
    data,
    pagination: {
      current: 1,
      limit: data.length,
      records: data.length,
      pages: 1,
    } satisfies IPage.IPagination,
  };
}
