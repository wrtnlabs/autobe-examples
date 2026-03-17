import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCartItem";
import { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCartItemAtSummaryTransformer } from "../transformers/ShoppingMallCartItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerCartItems(props: {
  customer: CustomerPayload;
  body: IShoppingMallCartItem.IRequest;
}): Promise<IPageIShoppingMallCartItem.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined =
    props.body.search !== undefined && props.body.search.trim().length !== 0
      ? props.body.search.trim()
      : undefined;
  const where = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.availability !== undefined
      ? { availability: props.body.availability }
      : {}),
    ...(props.body.shopping_mall_product_id !== undefined
      ? { shopping_mall_product_id: props.body.shopping_mall_product_id }
      : {}),
    ...(props.body.shopping_mall_product_variant_id !== undefined
      ? {
          shopping_mall_product_variant_id:
            props.body.shopping_mall_product_variant_id,
        }
      : {}),
    ...(search !== undefined
      ? {
          OR: [
            {
              product: {
                name: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              productVariant: {
                option_summary: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
            {
              productVariant: {
                sku_code: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            },
          ],
        }
      : {}),
  } satisfies Prisma.shopping_mall_cart_itemsWhereInput;
  const duplicateGroups =
    await MyGlobal.prisma.shopping_mall_cart_items.groupBy({
      by: ["shopping_mall_product_variant_id"],
      where,
      _count: {
        shopping_mall_product_variant_id: true,
      },
      having: {
        shopping_mall_product_variant_id: {
          _count: {
            gt: 1,
          },
        },
      },
    });
  if (duplicateGroups.length !== 0) {
    throw new HttpException("Duplicate cart lines detected", 500);
  }
  const orderBy =
    props.body.sort === "updated_at"
      ? ({
          updated_at: "asc",
        } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
      : props.body.sort === "-updated_at"
        ? ({
            updated_at: "desc",
          } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
        : props.body.sort === "created_at"
          ? ({
              created_at: "asc",
            } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
          : props.body.sort === "-created_at"
            ? ({
                created_at: "desc",
              } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
            : props.body.sort === "quantity"
              ? ({
                  quantity: "asc",
                } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
              : props.body.sort === "-quantity"
                ? ({
                    quantity: "desc",
                  } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
                : props.body.sort === "unit_price"
                  ? ({
                      unit_price: "asc",
                    } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
                  : props.body.sort === "-unit_price"
                    ? ({
                        unit_price: "desc",
                      } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput)
                    : ({
                        updated_at: "desc",
                      } satisfies Prisma.shopping_mall_cart_itemsOrderByWithRelationInput);
  const rows = await MyGlobal.prisma.shopping_mall_cart_items.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...ShoppingMallCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.shopping_mall_cart_items.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      rows,
      ShoppingMallCartItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
