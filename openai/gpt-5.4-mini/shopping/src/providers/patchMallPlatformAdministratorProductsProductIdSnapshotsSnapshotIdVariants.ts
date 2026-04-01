import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshot";
import { IMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductSnapshotVariant";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdSnapshotsSnapshotIdVariants(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductSnapshotVariant.IRequest;
}): Promise<IPageIMallPlatformProductSnapshotVariant.ISummary> {
  if (props.administrator.type !== "administrator") {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.mall_platform_product_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      mall_platform_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_product_snapshot_variantsWhereInput = {
    mall_platform_product_snapshot_id: props.snapshotId,
    ...(props.body.skuCode !== undefined
      ? { sku_code: props.body.skuCode }
      : {}),
    ...(props.body.isAvailable !== undefined
      ? { is_available: props.body.isAvailable }
      : {}),
    ...(props.body.priceOverrideMin !== undefined ||
    props.body.priceOverrideMax !== undefined
      ? {
          price_override: {
            ...(props.body.priceOverrideMin !== undefined
              ? { gte: props.body.priceOverrideMin }
              : {}),
            ...(props.body.priceOverrideMax !== undefined
              ? { lte: props.body.priceOverrideMax }
              : {}),
          },
        }
      : {}),
    ...(props.body.search !== undefined
      ? {
          OR: [
            { sku_code: { contains: props.body.search, mode: "insensitive" } },
            {
              option_values: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {}),
  };
  const orderBy: Prisma.mall_platform_product_snapshot_variantsOrderByWithRelationInput =
    props.body.sort === "skuCodeDesc"
      ? { sku_code: "desc" }
      : props.body.sort === "skuCodeAsc"
        ? { sku_code: "asc" }
        : props.body.sort === "createdAtDesc"
          ? { created_at: "desc" }
          : { created_at: "asc" };
  const total =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.count({
      where,
    });
  const rows =
    await MyGlobal.prisma.mall_platform_product_snapshot_variants.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        sku_code: true,
        option_values: true,
        price_override: true,
        is_available: true,
        created_at: true,
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: rows.map((row) => ({
      id: row.id,
      productSnapshot: {
        id: props.snapshotId,
        snapshotKind: "",
        productName: "",
        productDescription: "",
        categoryName: null,
        basePrice: 0,
        mainImageUri: null,
        imageCount: 0,
        variantCount: 0,
        createdAt: row.created_at.toISOString(),
      },
      skuCode: row.sku_code,
      optionValues: row.option_values,
      priceOverride: row.price_override,
      isAvailable: row.is_available,
      createdAt: row.created_at.toISOString(),
    })),
  };
}
