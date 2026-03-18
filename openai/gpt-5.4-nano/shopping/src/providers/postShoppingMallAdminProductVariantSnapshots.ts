import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallAdminProductVariantSnapshots(props: {
  admin: AdminPayload;
  body: IShoppingMallProductVariantSnapshot.ICreate;
}): Promise<IShoppingMallProductVariantSnapshot> {
  await MyGlobal.prisma.shopping_mall_product_variants.findUniqueOrThrow({
    where: { id: props.body.shopping_mall_product_variant_id },
    select: { id: true },
  });
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const id = v4() satisfies string & tags.Format<"uuid"> as string &
      tags.Format<"uuid">;
    const now = new Date();
    const created_at = toISOStringSafe(now) satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">;
    const updated_at = created_at satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">;
    await tx.shopping_mall_product_variant_snapshots.create({
      data: {
        id,
        shopping_mall_product_variant_id:
          props.body.shopping_mall_product_variant_id,
        code: props.body.code,
        name: props.body.name,
        price: props.body.price,
        currency: props.body.currency,
        is_available: props.body.is_available,
        variant_status: props.body.variant_status,
        created_at,
        updated_at,
        deleted_at: null,
      },
    });
    const snapshot =
      await tx.shopping_mall_product_variant_snapshots.findUniqueOrThrow({
        where: { id },
        select: {
          id: true,
          shopping_mall_product_variant_id: true,
          code: true,
          name: true,
          price: true,
          currency: true,
          is_available: true,
          variant_status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      });
    return {
      id: snapshot.id,
      shopping_mall_product_variant_id:
        snapshot.shopping_mall_product_variant_id,
      code: snapshot.code,
      name: snapshot.name,
      price: snapshot.price,
      currency: snapshot.currency,
      is_available: snapshot.is_available,
      variant_status: snapshot.variant_status,
      created_at: toISOStringSafe(snapshot.created_at),
      updated_at: toISOStringSafe(snapshot.updated_at),
      deleted_at: snapshot.deleted_at
        ? toISOStringSafe(snapshot.deleted_at)
        : null,
    } satisfies IShoppingMallProductVariantSnapshot;
  });
}
