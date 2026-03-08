import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotSkuTransformer } from "../transformers/ShoppingMallProductSnapshotSkuTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdSnapshotsSnapshotIdSkusSkuSnapshotId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  skuSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotSku> {
  const skuSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshot_skuses.findUniqueOrThrow(
      {
        where: {
          id: props.skuSnapshotId,
          snapshot: {
            id: props.snapshotId,
            product: {
              id: props.productId,
            },
          },
        },
        ...ShoppingMallProductSnapshotSkuTransformer.select(),
      },
    );
  return ShoppingMallProductSnapshotSkuTransformer.transform(skuSnapshot);
}
