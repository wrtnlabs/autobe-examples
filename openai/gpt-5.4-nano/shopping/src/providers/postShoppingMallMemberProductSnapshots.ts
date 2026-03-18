import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberProductSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallProductSnapshot.ICreate;
}): Promise<IShoppingMallProductSnapshot> {
  // validate business-level required fields
  if (props.body.snapshot_code.trim().length === 0) {
    throw new HttpException("snapshot_code is required", 400);
  }
  if (props.body.source_type.trim().length === 0) {
    throw new HttpException("source_type is required", 400);
  }
  if (props.body.source_entity_id.trim().length === 0) {
    throw new HttpException("source_entity_id is required", 400);
  }
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("reason is required", 400);
  }
  const prisma = MyGlobal.prisma;
  const created = await prisma.$transaction(async (tx) => {
    const inserted = await tx.shopping_mall_snapshots.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        snapshot_code: props.body.snapshot_code,
        source_type: props.body.source_type,
        source_entity_id: props.body.source_entity_id,
        source_seller_id: props.body.source_seller_id ?? null,
        source_order_id: props.body.source_order_id ?? null,
        source_order_item_id: props.body.source_order_item_id ?? null,
        source_review_id: props.body.source_review_id ?? null,
        source_cancellation_request_id:
          props.body.source_cancellation_request_id ?? null,
        source_refund_request_id: props.body.source_refund_request_id ?? null,
        created_by_member_id: props.member.id ?? null,
        reason: props.body.reason,
        created_at: toISOStringSafe(
          new Date(),
        ) as unknown as Prisma.shopping_mall_snapshotsCreateInput["created_at"],
        updated_at: toISOStringSafe(
          new Date(),
        ) as unknown as Prisma.shopping_mall_snapshotsCreateInput["updated_at"],
        deleted_at: null,
      },
    });
    return inserted;
  });
  const full = await prisma.shopping_mall_snapshots.findUniqueOrThrow({
    where: { id: created.id },
    ...ShoppingMallProductSnapshotTransformer.select(),
  });
  return await ShoppingMallProductSnapshotTransformer.transform(full);
}
