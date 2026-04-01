import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ShoppingMallProductImageTransformer } from "../transformers/ShoppingMallProductImageTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallMemberProductImages(props: {
  member: MemberPayload;
  body: IShoppingMallProductImage.ICreate;
}): Promise<IShoppingMallProductImage> {
  if (props.member.type !== "member") {
    throw new HttpException("Forbidden", 403);
  }
  const product =
    await MyGlobal.prisma.shopping_mall_products.findUniqueOrThrow({
      where: { id: props.body.shopping_mall_product_id },
      select: { id: true, shopping_mall_seller_id: true },
    });
  if (product.shopping_mall_seller_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const displayOrder =
    props.body.display_order !== undefined
      ? Math.trunc(props.body.display_order)
      : null;
  const activeBefore =
    await MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        deleted_at: null,
      },
      select: {
        id: true,
        href: true,
        alt_text: true,
        display_order: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { display_order: "asc" },
    });
  const nowIso = toISOStringSafe(new Date());
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const computedDisplayOrder =
      displayOrder === null
        ? ((
            await tx.shopping_mall_product_images.aggregate({
              _max: { display_order: true },
              where: {
                shopping_mall_product_id: props.body.shopping_mall_product_id,
                deleted_at: null,
              },
            })
          )._max.display_order ?? -1) + 1
        : displayOrder;
    const image = await tx.shopping_mall_product_images.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        href: props.body.href,
        alt_text: props.body.alt_text,
        display_order: computedDisplayOrder,
        deleted_at: null,
        created_at: nowIso as string & tags.Format<"date-time">,
        updated_at: nowIso as string & tags.Format<"date-time">,
        product: {
          connect: { id: props.body.shopping_mall_product_id },
        },
      },
      select: ShoppingMallProductImageTransformer.select().select,
    });
    const afterImages = await tx.shopping_mall_product_images.findMany({
      where: {
        shopping_mall_product_id: props.body.shopping_mall_product_id,
        deleted_at: null,
      },
      select: {
        id: true,
        href: true,
        alt_text: true,
        display_order: true,
        deleted_at: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: { display_order: "asc" },
    });
    const snapshotId = v4() as unknown as string & tags.Format<"uuid">;
    const snapshot = await tx.shopping_mall_snapshots.create({
      data: {
        id: snapshotId,
        snapshot_code: v4(),
        source_type: "product",
        source_entity_id: props.body.shopping_mall_product_id,
        source_seller_id: product.shopping_mall_seller_id,
        source_order_id: undefined,
        source_order_item_id: undefined,
        source_review_id: undefined,
        source_cancellation_request_id: undefined,
        source_refund_request_id: undefined,
        created_by_member_id: props.member.id,
        reason: "product_image_add",
        created_at: nowIso as string & tags.Format<"date-time">,
        updated_at: nowIso as string & tags.Format<"date-time">,
        deleted_at: null,
      },
      select: { id: true },
    });
    const payload = {
      before: activeBefore.map((x) => ({
        id: x.id,
        href: x.href,
        alt_text: x.alt_text,
        display_order: x.display_order,
      })),
      after: afterImages.map((x) => ({
        id: x.id,
        href: x.href,
        alt_text: x.alt_text,
        display_order: x.display_order,
      })),
    };
    await tx.shopping_mall_snapshot_payloads.create({
      data: {
        id: v4() as unknown as string & tags.Format<"uuid">,
        payload: JSON.stringify(payload),
        created_at: nowIso as string & tags.Format<"date-time">,
        updated_at: nowIso as string & tags.Format<"date-time">,
        deleted_at: null,
        snapshot: { connect: { id: snapshot.id } },
      },
    });
    return image;
  });
  return await ShoppingMallProductImageTransformer.transform(created);
}
