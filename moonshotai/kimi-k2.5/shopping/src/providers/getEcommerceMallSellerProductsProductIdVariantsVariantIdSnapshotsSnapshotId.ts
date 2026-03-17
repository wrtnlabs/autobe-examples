import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotTransformer } from "../transformers/EcommerceMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string;
  variantId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductVariantSnapshot> {
  // Fetch snapshot with ownership verification through product chain
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findFirst({
      where: {
        id: props.snapshotId,
        productVariant: {
          id: props.variantId,
          product: {
            id: props.productId,
            seller_id: props.seller.id,
          },
        },
      },
      ...EcommerceMallProductVariantSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
}
