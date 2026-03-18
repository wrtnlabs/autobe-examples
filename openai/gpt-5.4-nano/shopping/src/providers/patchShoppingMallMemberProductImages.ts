import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductImage";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallMemberProductImages(props: {
  member: MemberPayload;
  body: IShoppingMallProductImage.IRequest;
}): Promise<IPageIShoppingMallProductImage.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const deletedAtFilter =
    props.body.deletedAt === undefined
      ? undefined
      : props.body.deletedAt === null
        ? (null as IShoppingMallProductImage.ISummary["deleted_at"] | null)
        : (props.body.deletedAt as string & tags.Format<"date-time">);
  const productWhere = {
    ...(props.body.shoppingMallProductId !== undefined
      ? { id: props.body.shoppingMallProductId }
      : {}),
    shopping_mall_seller_id: props.member.id,
    ...(deletedAtFilter === undefined
      ? {}
      : deletedAtFilter === null
        ? {}
        : {}),
  } satisfies Prisma.shopping_mall_productsWhereInput;
  const whereImages = {
    ...(props.body.shoppingMallProductId !== undefined
      ? { shopping_mall_product_id: props.body.shoppingMallProductId }
      : {}),
    ...(props.body.hrefKeyword !== undefined && props.body.hrefKeyword !== ""
      ? { href: { contains: props.body.hrefKeyword, mode: "insensitive" } }
      : {}),
    ...(props.body.altTextKeyword !== undefined &&
    props.body.altTextKeyword !== ""
      ? {
          alt_text: {
            contains: props.body.altTextKeyword,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.deletedAt === undefined
      ? {}
      : props.body.deletedAt === null
        ? { deleted_at: null }
        : { deleted_at: props.body.deletedAt }),
    product: {
      shopping_mall_seller_id: props.member.id,
      ...(props.body.shoppingMallProductId !== undefined
        ? { id: props.body.shoppingMallProductId }
        : {}),
    },
    deleted_at:
      props.body.deletedAt === undefined
        ? undefined
        : props.body.deletedAt === null
          ? null
          : props.body.deletedAt,
  } satisfies Prisma.shopping_mall_product_imagesWhereInput;
  const orderBy =
    props.body.sort === "displayOrderAsc"
      ? [{ display_order: "asc" as const }, { created_at: "desc" as const }]
      : [{ display_order: "asc" as const }, { created_at: "desc" as const }];
  const [items, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: whereImages,
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        href: true,
        alt_text: true,
        display_order: true,
        shopping_mall_product_id: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    }),
    MyGlobal.prisma.shopping_mall_product_images.count({ where: whereImages }),
  ]);
  return {
    data: items.map((img) => ({
      id: img.id as string & tags.Format<"uuid">,
      href: img.href as string & tags.Format<"uri">,
      alt_text: img.alt_text,
      display_order: img.display_order as number & tags.Type<"int32">,
      shopping_mall_product_id: img.shopping_mall_product_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(img.created_at),
      updated_at: toISOStringSafe(img.updated_at),
      deleted_at:
        img.deleted_at === null ? null : toISOStringSafe(img.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: limit === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
