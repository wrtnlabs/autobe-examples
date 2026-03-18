import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ShoppingMallProductVariantSnapshotCollector } from "../collectors/ShoppingMallProductVariantSnapshotCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberProductVariantSnapshots(props: {
  member: MemberPayload;
  body: IShoppingMallProductVariantSnapshot.ICreate;
}): Promise<IShoppingMallProductVariantSnapshot> {
  // verify variant exists
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_product_variant_id },
    select: { id: true },
  });
  // verify member session (extra safety)
  const session = await MyGlobal.prisma.shopping_mall_member_sessions.findFirst(
    {
      where: {
        id: props.member.session_id,
        shopping_mall_member_id: props.member.id,
        expired_at: { gt: new Date() },
      },
      select: {
        id: true,
        shopping_mall_member_id: true,
        member: { select: { deleted_at: true } },
      },
    },
  );
  if (session === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  if (session.member.deleted_at !== null) {
    throw new HttpException("You're not enrolled", 403);
  }
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const snap = await tx.shopping_mall_product_variant_snapshots.create({
      data: await ShoppingMallProductVariantSnapshotCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallProductVariantSnapshotTransformer.select(),
    });
    return snap;
  });
  return await ShoppingMallProductVariantSnapshotTransformer.transform(created);
}
