import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductSnapshotImageCopy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImageCopy";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotImageCopyTransformer } from "../transformers/ShoppingMallProductSnapshotImageCopyTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdImageCopiesImageCopyId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  productSnapshotId: string & tags.Format<"uuid">;
  imageCopyId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotImageCopy> {
  const imageCopy = await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.productId },
      select: {
        id: true,
        shopping_mall_seller_id: true,
      },
    });
    await prisma.shopping_mall_product_snapshots.findFirstOrThrow({
      where: {
        id: props.productSnapshotId,
        shopping_mall_product_id: props.productId,
      },
      select: {
        id: true,
      },
    });
    return await prisma.shopping_mall_product_snapshot_image_copies.findFirstOrThrow(
      {
        where: {
          id: props.imageCopyId,
          shopping_mall_product_snapshot_id: props.productSnapshotId,
        },
        ...ShoppingMallProductSnapshotImageCopyTransformer.select(),
      },
    );
  });
  return await ShoppingMallProductSnapshotImageCopyTransformer.transform(
    imageCopy,
  );
}
