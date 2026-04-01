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
  const deletedAtFilter = props.body.deletedAt ?? null;
  const productScope = (props.body.shoppingMallProductId ?? null) as
    | (string & tags.Format<"uuid">)
    | null;
  let productWhere: Prisma.shopping_mall_productsWhereInput = {
    deleted_at: null,
  };
  if (productScope) {
    productWhere = {
      ...productWhere,
      id: productScope,
      shopping_mall_seller_id: props.member.id,
    };
  } else {
    productWhere = {
      ...productWhere,
      shopping_mall_seller_id: props.member.id,
    };
  }
  if (productScope) {
    const product = await MyGlobal.prisma.shopping_mall_products.findFirst({
      where: productWhere,
      select: { id: true },
    });
    if (product === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const where = {
    deleted_at: deletedAtFilter,
    ...(productScope
      ? {
          shopping_mall_product_id: productScope,
        }
      : {
          shopping_mall_product: {
            // relation filter via FK through join if supported
          },
        }),
  } satisfies Prisma.shopping_mall_product_imagesWhereInput;
  const [items, total] = await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.shopping_mall_product_images.findMany({
      where: where as unknown as Prisma.shopping_mall_product_imagesWhereInput,
      skip,
      take: limit,
      orderBy: { display_order: "asc" },
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
    MyGlobal.prisma.shopping_mall_product_images.count({
      where: where as unknown as Prisma.shopping_mall_product_imagesWhereInput,
    }),
  ]);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: items.map((x) => ({
      id: x.id as string & tags.Format<"uuid">,
      href: x.href as string & tags.Format<"uri">,
      alt_text: x.alt_text,
      display_order: x.display_order,
      shopping_mall_product_id: x.shopping_mall_product_id as string &
        tags.Format<"uuid">,
      created_at: toISOStringSafe(x.created_at) as string &
        tags.Format<"date-time">,
      updated_at: toISOStringSafe(x.updated_at) as string &
        tags.Format<"date-time">,
      deleted_at:
        x.deleted_at === null
          ? null
          : (toISOStringSafe(x.deleted_at) as string &
              tags.Format<"date-time">),
    })),
  } satisfies IPageIShoppingMallProductImage.ISummary;
}
