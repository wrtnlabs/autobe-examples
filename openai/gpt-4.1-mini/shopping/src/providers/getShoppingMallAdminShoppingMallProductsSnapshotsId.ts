import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function getShoppingMallAdminShoppingMallProductsSnapshotsId(props: {
  admin: AdminPayload;
  id: string & tags.Format<"uuid">;
}): Promise<IShoppingMallProductSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_product_snapshots.findUnique({
      where: { id: props.id },
    });

  if (!snapshot) {
    throw new HttpException("Shopping mall product snapshot not found", 404);
  }

  return {
    id: snapshot.id,
    shopping_mall_product_id: snapshot.shopping_mall_product_id,
    code: snapshot.code,
    title: snapshot.title,
    description: snapshot.description ?? null,
    brand: snapshot.brand ?? null,
    snapshot_at: toISOStringSafe(snapshot.snapshot_at),
    created_at: toISOStringSafe(snapshot.created_at),
  };
}
