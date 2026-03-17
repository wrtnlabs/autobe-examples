import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify variant exists and belongs to the product
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: {
        id: props.variantId,
        product_id: props.productId,
      },
      select: { id: true },
    });
  // Verify seller owns the product
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: {
      id: props.productId,
    },
    select: { id: true },
  });
  // Build filters from request body
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput =
    {
      product_id: props.productId,
      product_variant_id: props.variantId,
    };
  const andConditions: Prisma.ecommerce_mall_product_variant_snapshotsWhereInput[] =
    [];
  if (props.body.search !== undefined) {
    whereInput.sku_code = { contains: props.body.search, mode: "insensitive" };
  }
  if (props.body.fromDate !== undefined) {
    andConditions.push({ created_at: { gte: new Date(props.body.fromDate) } });
  }
  if (props.body.toDate !== undefined) {
    andConditions.push({ created_at: { lt: new Date(props.body.toDate) } });
  }
  if (andConditions.length > 0) {
    whereInput.AND = andConditions;
  }
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallProductVariantSnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductVariantSnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
