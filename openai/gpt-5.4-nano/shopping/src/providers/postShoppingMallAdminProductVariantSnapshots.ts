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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ShoppingMallProductVariantSnapshotTransformer } from "../transformers/ShoppingMallProductVariantSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminProductVariantSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductVariantSnapshot.ICreate;
}): Promise<IShoppingMallProductVariantSnapshot> {
  const enrolledAdmin = await MyGlobal.prisma.shopping_mall_admins.findFirst({
    where: { id: props.admin.id, deleted_at: null },
    select: { id: true },
  });
  if (enrolledAdmin === null) {
    throw new HttpException("You're not enrolled", 403);
  }
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_product_variant_id },
    select: { id: true },
  });
  const created =
    await MyGlobal.prisma.shopping_mall_product_variant_snapshots.create({
      data: await ShoppingMallProductVariantSnapshotCollector.collect({
        body: props.body,
      }),
      ...ShoppingMallProductVariantSnapshotTransformer.select(),
    });
  return await ShoppingMallProductVariantSnapshotTransformer.transform(created);
}
