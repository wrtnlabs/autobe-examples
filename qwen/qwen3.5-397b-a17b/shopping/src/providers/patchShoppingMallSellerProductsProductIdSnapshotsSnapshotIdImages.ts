import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotAtSummaryTransformer } from "../transformers/ShoppingMallProductSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImages(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallProductSnapshot.IUpdate;
}): Promise<IShoppingMallProductSnapshot.ISummary> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
        shopping_mall_product_id: true,
      },
    });
  const product = await MyGlobal.prisma.shopping_mall_products.findFirstOrThrow(
    {
      where: {
        id: props.productId,
        shopping_mall_seller_id: props.seller.id,
        deleted_at: null,
      },
    },
  );
  const record =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
      },
      ...ShoppingMallProductSnapshotAtSummaryTransformer.select(),
    });
  return await ShoppingMallProductSnapshotAtSummaryTransformer.transform(
    record,
  );
}
