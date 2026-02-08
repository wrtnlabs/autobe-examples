import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorProductSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (!snapshot) {
    throw new HttpException("Product snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_product_id: snapshot.shopping_mall_product_id,
    name: snapshot.name,
    description: snapshot.description,
    category_id: snapshot.category_id,
    base_price: snapshot.base_price,
    deleted_at: snapshot.deleted_at
      ? toISOStringSafe(snapshot.deleted_at)
      : null,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
  };
}
