import { IEcommerceProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceProductSnapshotTransformer } from "../transformers/EcommerceProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceProductSnapshot> {
  const record =
    await MyGlobal.prisma.ecommerce_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        ecommerce_product_id: props.productId,
      },
      select: {
        id: true,
        name: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        product: {
          select: {
            id: true,
            seller_id: true,
          },
        },
        ecommerceProductSnapshotVariants: {
          select: {
            id: true,
          },
        } satisfies Prisma.ecommerce_product_snapshot_variantsFindManyArgs,
      },
    });
  if (record.product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await EcommerceProductSnapshotTransformer.transform(record);
}
