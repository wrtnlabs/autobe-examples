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
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_product_variant_id },
    select: { id: true },
  });
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const data = await ShoppingMallProductVariantSnapshotCollector.collect({
      body: props.body,
    });
    return await tx.shopping_mall_product_variant_snapshots.create({
      data,
      ...ShoppingMallProductVariantSnapshotTransformer.select(),
    });
  });
  return await ShoppingMallProductVariantSnapshotTransformer.transform(created);
}
