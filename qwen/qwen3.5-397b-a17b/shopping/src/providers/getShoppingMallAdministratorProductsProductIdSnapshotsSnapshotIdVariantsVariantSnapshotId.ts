import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotVariant";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallProductSnapshotVariantTransformer } from "../transformers/ShoppingMallProductSnapshotVariantTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductsProductIdSnapshotsSnapshotIdVariantsVariantSnapshotId(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  variantSnapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshotVariant> {
  const variantSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshot_variants.findUniqueOrThrow(
      {
        where: { id: props.variantSnapshotId },
        select: {
          id: true,
          sku_code: true,
          price_override: true,
          stock_quantity: true,
          created_at: true,
          shopping_mall_product_snapshot_id: true,
        },
      },
    );
  if (variantSnapshot.shopping_mall_product_snapshot_id !== props.snapshotId) {
    throw new HttpException(
      "Variant snapshot does not belong to the specified product snapshot",
      404,
    );
  }
  const productSnapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUniqueOrThrow({
      where: { id: variantSnapshot.shopping_mall_product_snapshot_id },
      select: { id: true, shopping_mall_product_id: true },
    });
  if (productSnapshot.shopping_mall_product_id !== props.productId) {
    throw new HttpException(
      "Product snapshot does not belong to the specified product",
      404,
    );
  }
  return await ShoppingMallProductSnapshotVariantTransformer.transform(
    variantSnapshot,
  );
}
