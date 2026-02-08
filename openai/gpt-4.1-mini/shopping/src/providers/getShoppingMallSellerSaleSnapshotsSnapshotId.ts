import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getShoppingMallSellerSaleSnapshotsSnapshotId(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallSaleSnapshot> {
  const record = await MyGlobal.prisma.shopping_mall_sale_snapshots.findUnique({
    where: { id: props.snapshotId },
  });
  if (!record) throw new HttpException("Sale snapshot not found", 404);
  return {
    id: record.id,
    shopping_mall_sale_id: record.shopping_mall_sale_id,
    title: record.title,
    description: record.description,
    category_id: record.category_id,
    base_price: record.base_price,
    created_at: toISOStringSafe(record.created_at),
    updated_at: toISOStringSafe(record.updated_at),
    deleted_at: record.deleted_at ? toISOStringSafe(record.deleted_at) : null,
  };
}
