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
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallAdministratorSaleSnapshotsSnapshotId(props: {
  administrator: AdministratorPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSnapshot> {
  const snapshot =
    await MyGlobal.prisma.shopping_mall_sale_snapshots.findUnique({
      where: { id: props.snapshotId },
    });
  if (snapshot === null) {
    throw new HttpException("Sale snapshot not found", 404);
  }
  return {
    id: snapshot.id,
    shopping_mall_sale_id: snapshot.shopping_mall_sale_id,
    title: snapshot.title,
    description: snapshot.description,
    category_id: snapshot.category_id,
    base_price: snapshot.base_price,
    created_at: toISOStringSafe(snapshot.created_at),
    updated_at: toISOStringSafe(snapshot.updated_at),
    deleted_at:
      snapshot.deleted_at === null
        ? null
        : toISOStringSafe(snapshot.deleted_at),
  };
}
