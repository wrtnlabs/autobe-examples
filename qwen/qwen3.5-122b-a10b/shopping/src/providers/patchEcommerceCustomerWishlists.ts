import { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceWishlistItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceWishlistItemAtSummaryTransformer } from "../transformers/EcommerceWishlistItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceCustomerWishlists(props: {
  customer: CustomerPayload;
  body: IEcommerceWishlistItem.IRequest;
}): Promise<IPageIEcommerceWishlistItem.ISummary> {
  const wishlist = await MyGlobal.prisma.ecommerce_wishlists.findFirst({
    where: {
      ecommerce_customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  if (wishlist === null) {
    throw new HttpException("Wishlist not found", 404);
  }
  const productConditions: Prisma.ecommerce_productsWhereInput = {};
  if (props.body.search !== undefined) {
    productConditions.name = {
      contains: props.body.search,
      mode: "insensitive",
    };
  }
  const where: Prisma.ecommerce_wishlist_itemsWhereInput = {
    ecommerce_wishlist_id: wishlist.id,
    deleted_at: null,
  };
  if (Object.keys(productConditions).length > 0) {
    where.ecommerceProduct = productConditions;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    where.created_at = {};
    if (props.body.created_at_from !== undefined) {
      where.created_at.gte = new Date(props.body.created_at_from);
    }
    if (props.body.created_at_to !== undefined) {
      where.created_at.lte = new Date(props.body.created_at_to);
    }
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  let cursor: Prisma.ecommerce_wishlist_itemsWhereUniqueInput | undefined;
  let skipValue: number | undefined = skip;
  if (props.body.cursor !== undefined) {
    try {
      const decoded: {
        created_at: string;
        id: string;
      } = typia.assert<{
        created_at: string;
        id: string;
      }>(JSON.parse(Buffer.from(props.body.cursor, "base64").toString()));
      cursor = {
        id: decoded.id,
      };
      skipValue = undefined;
    } catch {
      throw new HttpException("Invalid cursor", 400);
    }
  }
  const orderBy: Prisma.ecommerce_wishlist_itemsOrderByWithRelationInput = {
    created_at: "desc",
    id: "desc",
  };
  const records = await MyGlobal.prisma.ecommerce_wishlist_items.findMany({
    where,
    cursor,
    skip: skipValue,
    take: limit + 1,
    orderBy,
    ...EcommerceWishlistItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_wishlist_items.count({ where });
  const hasNext = records.length > limit;
  if (hasNext) {
    records.pop();
  }
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceWishlistItemAtSummaryTransformer.transform,
  );
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIEcommerceWishlistItem.ISummary;
}
