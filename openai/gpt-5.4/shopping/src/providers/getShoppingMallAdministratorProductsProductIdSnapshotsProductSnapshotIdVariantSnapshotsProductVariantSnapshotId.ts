import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdSnapshotsProductSnapshotIdVariantSnapshotsProductVariantSnapshotId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  productSnapshotId: string & tags.Format<"uuid">;
  productVariantSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductVariantSnapshot> {
  await MyGlobal.prisma.shopping_mall_product_snapshots.findFirstOrThrow({
    where: {
      id: props.productSnapshotId,
      shopping_mall_product_id: props.productId,
    },
    select: {
      id: true,
    },
  });
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.findFirstOrThrow(
      {
        where: {
          id: props.productVariantSnapshotId,
          shopping_mall_product_snapshot_id: props.productSnapshotId,
          productSnapshot: {
            is: {
              shopping_mall_product_id: props.productId,
            },
          },
          productVariant: {
            is: {
              shopping_mall_product_id: props.productId,
            },
          },
        },
        ...ShoppingMallProductVariantSnapshotTransformer.select(),
      },
    );
  return await ShoppingMallProductVariantSnapshotTransformer.transform(
    snapshot,
  );
}
