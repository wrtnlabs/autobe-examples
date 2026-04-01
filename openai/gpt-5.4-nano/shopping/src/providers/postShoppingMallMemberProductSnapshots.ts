import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductSnapshotCollector } from "../collectors/ShoppingMallProductSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductSnapshotTransformer } from "../transformers/ShoppingMallProductSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberProductSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallProductSnapshot.ICreate;
}): Promise<IShoppingMallProductSnapshot> {
  const body = props.body;
  if (body.snapshot_code.trim().length === 0) {
    throw new HttpException("snapshot_code is required", 400);
  }
  if (body.source_type.trim().length === 0) {
    throw new HttpException("source_type is required", 400);
  }
  if (body.source_entity_id.trim().length === 0) {
    throw new HttpException("source_entity_id is required", 400);
  }
  if (body.reason.trim().length === 0) {
    throw new HttpException("reason is required", 400);
  }
  const createdAt = toISOStringSafe(new Date());
  const updatedAt = toISOStringSafe(new Date());
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallProductSnapshotCollector.collect({
      body,
    });
    try {
      const created = await tx.shopping_mall_snapshots.create({
        data: {
          ...data,
          created_by_member_id: props.member.id,
          created_at: createdAt,
          updated_at: updatedAt,
          deleted_at: null,
        },
        ...ShoppingMallProductSnapshotTransformer.select(),
      });
      return await ShoppingMallProductSnapshotTransformer.transform(created);
    } catch (e) {
      if (e && typeof e === "object" && "code" in e) {
        const code = (
          e as {
            code?: string;
          }
        ).code;
        if (code === "P2002") {
          throw new HttpException("snapshot_code already exists", 409);
        }
      }
      throw e;
    }
  });
}
