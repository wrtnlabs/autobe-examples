import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import { IEcommerceMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotImage";
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
  productId: string;
  snapshotId: string;
}): Promise<IEcommerceMallProductSnapshot> {
  // Verify the product exists and check ownership
  const product = await MyGlobal.prisma.ecommerce_mall_products.findFirst({
    where: {
      id: props.productId,
    },
    select: {
      id: true,
      seller_id: true,
    },
  });
  if (product === null) {
    throw new HttpException("Product not found", 404);
  }
  // Check ownership - seller can only access their own products
  // Admin type check: admin payload would have type "admin" not "seller"
  // Since the decorator is SellerAuth, we only get seller type here
  if (product.seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Query the snapshot using the transformer select
  const snapshot =
    await MyGlobal.prisma.ecommerce_mall_product_snapshots.findUnique({
      where: {
        id: props.snapshotId,
        product_id: props.productId,
      },
      ...EcommerceMallProductSnapshotTransformer.select(),
    });
  if (snapshot === null) {
    throw new HttpException("Snapshot not found", 404);
  }
  return await EcommerceMallProductSnapshotTransformer.transform(snapshot);
}
