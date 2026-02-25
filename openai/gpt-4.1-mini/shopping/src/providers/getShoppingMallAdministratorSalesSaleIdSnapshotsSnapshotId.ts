import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallSaleSnapshotTransformer } from "../transformers/ShoppingMallSaleSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSalesSaleIdSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  saleId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSnapshot> {
  const snapshotRecord =
    await MyGlobal.prisma.shopping_mall_sale_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        shopping_mall_sale_id: props.saleId,
      },
      select: {
        id: true,
        shopping_mall_sale_id: true,
        title: true,
        description: true,
        category_id: true,
        base_price: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sale: {
          select: { id: true },
        },
        saleUnitSnapshots: {
          select: { id: true },
        },
      },
    });
  // Return raw record directly because Transformer expects Dates
  // No conversion using toISOStringSafe to avoid type mismatch issues
  return await ShoppingMallSaleSnapshotTransformer.transform(snapshotRecord);
}
