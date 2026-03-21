import { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdVariantsVariantIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  variantId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshotVariant> {
  // Query the variant snapshot and verify ownership through product snapshot join
  const variantSnapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshot_variants.findUniqueOrThrow(
      {
        where: { id: props.snapshotId },
        select: {
          id: true,
          sku: true,
          price_override: true,
          stock_quantity: true,
          created_at: true,
          productSnapshot: {
            select: {
              id: true,
              ecommerce_mall_product_id: true,
              ecommerce_mall_seller_id: true,
            },
          },
          optionValues: {
            select: {
              id: true,
              key: true,
              value: true,
              created_at: true,
            },
            orderBy: { created_at: "asc" },
          },
        },
      },
    );
  // Verify the variant belongs to the specified product
  if (
    variantSnapshot.productSnapshot.ecommerce_mall_product_id !==
    props.productId
  ) {
    throw new HttpException("Product variant snapshot not found", 404);
  }
  // Verify the variant's product belongs to this seller
  if (
    variantSnapshot.productSnapshot.ecommerce_mall_seller_id !== props.seller.id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Build response with proper date conversion
  return {
    id: variantSnapshot.id,
    sku: variantSnapshot.sku,
    price_override: variantSnapshot.price_override,
    stock_quantity: variantSnapshot.stock_quantity,
    created_at: variantSnapshot.created_at.toISOString() as string &
      tags.Format<"date-time">,
    optionValues: variantSnapshot.optionValues.map((ov) => ({
      id: ov.id,
      key: ov.key,
      value: ov.value,
      created_at: ov.created_at.toISOString() as string &
        tags.Format<"date-time">,
    })),
  };
}
