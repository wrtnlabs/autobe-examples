import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ShoppingMallProductSnapshotImageTransformer } from "../transformers/ShoppingMallProductSnapshotImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerProductsProductIdSnapshotsSnapshotIdImagesImageId(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  imageId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImage> {
  if (props.seller.type !== "seller") {
    throw new HttpException("Forbidden", 403);
  }
  const image =
    await MyGlobal.prisma.shopping_mall_product_snapshot_images.findFirstOrThrow(
      {
        where: {
          id: props.imageId,
          shopping_mall_product_snapshot_id: props.snapshotId,
          productSnapshot: {
            id: props.snapshotId,
            shopping_mall_product_id: props.productId,
          },
        },
        ...ShoppingMallProductSnapshotImageTransformer.select(),
      },
    );
  return await ShoppingMallProductSnapshotImageTransformer.transform(image);
}
