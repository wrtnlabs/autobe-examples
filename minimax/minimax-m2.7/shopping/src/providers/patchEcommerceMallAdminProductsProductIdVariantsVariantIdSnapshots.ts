import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductSnapshotVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductSnapshotVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshots(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductSnapshotVariant.IRequest;
}): Promise<IPageIEcommerceMallProductSnapshotVariant.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_products.findUniqueOrThrow({
    where: { id: props.productId },
  });
  const variant =
    await MyGlobal.prisma.ecommerce_mall_product_variants.findUniqueOrThrow({
      where: { id: props.variantId },
      select: { id: true, ecommerce_mall_product_id: true },
    });
  if (variant.ecommerce_mall_product_id !== props.productId) {
    throw new HttpException(
      "Variant does not belong to the specified product",
      400,
    );
  }
  const whereCreatedAt = {
    ...(props.body.created_after && {
      created_at: { gte: new Date(props.body.created_after) },
    }),
    ...(props.body.created_before && {
      created_at: { lte: new Date(props.body.created_before) },
    }),
  };
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.findMany({
      where: {
        productSnapshot: {
          ecommerce_mall_product_id: props.productId,
        },
        ...whereCreatedAt,
      },
      skip,
      take: limit,
      orderBy:
        props.body.sort === "created_at"
          ? { created_at: "asc" }
          : { created_at: "desc" },
      ...EcommerceMallProductSnapshotVariantAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.count({
      where: {
        productSnapshot: {
          ecommerce_mall_product_id: props.productId,
        },
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallProductSnapshotVariantAtSummaryTransformer.transform,
    ),
  };
}
