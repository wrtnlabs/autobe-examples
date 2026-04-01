import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminProductSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductSnapshot.ICreate;
}): Promise<IShoppingMallProductSnapshot> {
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const admin = await tx.shopping_mall_admins.findFirst({
      where: { id: props.admin.id, deleted_at: null },
      select: { id: true },
    });
    if (admin === null) {
      throw new HttpException("You're not enrolled", 403);
    }
    const createdAt = toISOStringSafe(new Date());
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4(),
        snapshot_code: props.body.snapshot_code,
        source_type: props.body.source_type,
        source_entity_id: props.body.source_entity_id,
        source_seller_id:
          props.body.source_seller_id === undefined
            ? null
            : props.body.source_seller_id,
        source_order_id:
          props.body.source_order_id === undefined
            ? null
            : props.body.source_order_id,
        source_order_item_id:
          props.body.source_order_item_id === undefined
            ? null
            : props.body.source_order_item_id,
        source_review_id:
          props.body.source_review_id === undefined
            ? null
            : props.body.source_review_id,
        source_cancellation_request_id:
          props.body.source_cancellation_request_id === undefined
            ? null
            : props.body.source_cancellation_request_id,
        source_refund_request_id:
          props.body.source_refund_request_id === undefined
            ? null
            : props.body.source_refund_request_id,
        created_by_member_id: null,
        reason: props.body.reason,
        created_at: createdAt,
        updated_at: createdAt,
        deleted_at: null,
      },
    });
    const selected = await tx.shopping_mall_product_snapshots.findUnique({
      where: { id: snapshot.id },
      ...ShoppingMallProductSnapshotTransformer.select(),
    });
    if (selected === null) {
      throw new HttpException("Snapshot not found after creation", 500);
    }
    return await ShoppingMallProductSnapshotTransformer.transform(selected);
  });
}
