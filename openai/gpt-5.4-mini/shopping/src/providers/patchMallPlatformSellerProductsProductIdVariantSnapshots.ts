import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import { IMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshot";
import { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformProductVariantSnapshotTransformer } from "../transformers/MallPlatformProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdVariantSnapshots(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshot.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshot.ISummary> {
  const product =
    await MyGlobal.prisma.mall_platform_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        seller_account_id: true,
      },
    });
  if (product.seller_account_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    product: {
      id: props.productId,
    },
    ...(props.body.search === undefined
      ? {}
      : {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_summary: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              snapshot_reason: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              productVariant: {
                sku_code: { contains: props.body.search, mode: "insensitive" },
              },
            },
            {
              productVariant: {
                option_values: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }),
  } satisfies Prisma.mall_platform_product_variant_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "oldest"
      ? [{ created_at: "asc" as const }]
      : [{ created_at: "desc" as const }]
  ) satisfies Prisma.mall_platform_product_variant_snapshotsOrderByWithRelationInput[];
  const data =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...MallPlatformProductVariantSnapshotTransformer.select(),
    });
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformProductVariantSnapshotTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: records,
      pages: Math.ceil(records / limit),
    },
  };
}
