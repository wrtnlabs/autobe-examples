import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCartItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallCartItemAtSummaryTransformer } from "../transformers/EcommerceMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCartItem.IRequest;
}): Promise<IPageIEcommerceMallCartItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search && {
      productVariant: {
        product: {
          name: {
            contains: props.body.search,
            mode: "insensitive",
          },
        },
      },
    }),
    ...(props.body.is_available !== undefined && {
      productVariant: {
        deleted_at: props.body.is_available ? null : { not: null },
        stock_quantity: props.body.is_available ? { gt: 0 } : { equals: 0 },
      },
    }),
    ...(props.body.added_at_from && {
      added_at: {
        gte: new Date(props.body.added_at_from),
      },
    }),
    ...(props.body.added_at_to && {
      added_at: {
        lte: new Date(props.body.added_at_to),
      },
    }),
  };
  const cursorInput: Prisma.ecommerce_mall_cart_itemsWhereInput | undefined =
    props.body.cursor_added_at && props.body.cursor_id
      ? {
          OR: [
            {
              added_at: {
                gt: new Date(props.body.cursor_added_at),
              },
            },
            {
              added_at: {
                equals: new Date(props.body.cursor_added_at),
              },
              id: {
                gt: props.body.cursor_id,
              },
            },
          ],
        }
      : undefined;
  const orderByInput: Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput =
    props.body.sort
      ? props.body.sort === "quantity"
        ? { quantity: "desc" as const }
        : props.body.sort === "price"
          ? { productVariant: { price: "desc" as const } }
          : { added_at: "desc" as const }
      : { added_at: "desc" as const };
  const data = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where: cursorInput ? { ...whereInput, AND: [cursorInput] } : whereInput,
    skip: props.body.cursor_added_at ? undefined : skip,
    take: limit + 1,
    orderBy: orderByInput,
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  const hasMore = data.length > limit;
  if (hasMore) {
    data.pop();
  }
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCartItemAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallCartItem.ISummary;
}
