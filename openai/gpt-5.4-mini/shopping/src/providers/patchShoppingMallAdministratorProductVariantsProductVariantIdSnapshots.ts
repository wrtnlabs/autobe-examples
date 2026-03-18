import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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

export async function patchShoppingMallAdministratorProductVariantsProductVariantIdSnapshots(props: {
  administrator: AdministratorPayload;
  productVariantId: string & tags.Format<"uuid">;
  body: IShoppingMallProductVariantSnapshot.IRequest;
}): Promise<IPageIShoppingMallProductVariantSnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.productVariantId },
    select: {
      id: true,
      shopping_mall_product_id: true,
    },
  });
  const snapshots =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findMany({
      where: { shopping_mall_product_variant_id: props.productVariantId },
      orderBy: { created_at: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        shopping_mall_product_variant_id: true,
        sku_code: true,
        option_values: true,
        price: true,
        stock_quantity: true,
        created_at: true,
      },
    });
  const total: number =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.count({
      where: { shopping_mall_product_variant_id: props.productVariantId },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: snapshots.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          productVariant: {
            id: props.productVariantId,
            skuCode: snapshot.sku_code,
            overridePrice: null,
            stockQuantity: snapshot.stock_quantity,
            createdAt: snapshot.created_at.toISOString(),
            updatedAt: snapshot.created_at.toISOString(),
            deletedAt: null,
          } satisfies IShoppingMallProductVariant.ISummary,
          skuCode: snapshot.sku_code,
          optionValues: snapshot.option_values,
          price: snapshot.price,
          stockQuantity: snapshot.stock_quantity,
          createdAt: snapshot.created_at.toISOString(),
        }) satisfies IShoppingMallProductVariantSnapshot.ISummary,
    ),
  };
}
