import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallProductAtSummaryTransformer } from "../transformers/EcommerceMallProductAtSummaryTransformer";
import { EcommerceMallProductVariantAtSummaryTransformer } from "../transformers/EcommerceMallProductVariantAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallAdminProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  admin: AdminPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          product_id: true,
          product_variant_id: true,
          sku_code: true,
          options: true,
          price: true,
          stock_quantity: true,
          status: true,
          created_at: true,
          product: EcommerceMallProductAtSummaryTransformer.select(),
          productVariant:
            EcommerceMallProductVariantAtSummaryTransformer.select(),
        },
      },
    );
  // Verify snapshot belongs to the specified product
  if (snapshot.product_id !== props.productId) {
    throw new HttpException(
      "Snapshot does not belong to the specified product",
      404,
    );
  }
  // Verify snapshot belongs to the specified variant
  if (snapshot.product_variant_id !== props.variantId) {
    throw new HttpException(
      "Snapshot does not belong to the specified variant",
      404,
    );
  }
  return {
    id: snapshot.id,
    sku_code: snapshot.sku_code,
    options: snapshot.options,
    price: snapshot.price,
    stock_quantity: snapshot.stock_quantity,
    status: snapshot.status,
    created_at: toISOStringSafe(snapshot.created_at),
    product: await EcommerceMallProductAtSummaryTransformer.transform(
      snapshot.product,
    ),
    productVariant:
      await EcommerceMallProductVariantAtSummaryTransformer.transform(
        snapshot.productVariant,
      ),
  };
}
