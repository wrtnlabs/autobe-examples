import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductSnapshotTransformer } from "../transformers/EcommerceMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getEcommerceMallSellerProductsProductIdSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUniqueOrThrow({
      where: { id: props.snapshotId },
      select: {
        id: true,
        product:
          EcommerceMallProductSnapshotTransformer.select().select.product,
        created_at: true,
        updated_at: true,
        status: true,
        name: true,
        base_price: true,
        sale_price: true,
        slug: true,
        description: true,
        tags: true,
      },
    });
  const productOwnerId = snapshot.product.seller.id as string &
    tags.Format<"uuid">;
  if (productOwnerId !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const snapshotProductId = snapshot.product.id as string & tags.Format<"uuid">;
  if (snapshotProductId !== props.productId) {
    throw new HttpException("Invalid productId", 400);
  }
  const result =
    await EcommerceMallProductSnapshotTransformer.transform(snapshot);
  return result;
}
