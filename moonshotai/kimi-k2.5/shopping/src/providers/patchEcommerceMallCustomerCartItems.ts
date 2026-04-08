import { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
  // Build base where condition - only customer's items, not deleted
  const baseWhere = {
    customer_id: props.customer.id,
    deleted_at: null,
  } satisfies Prisma.ecommerce_mall_cart_itemsWhereInput;
  // Build search condition if search term provided
  const searchTerm = props.body.search?.trim();
  const searchWhere: Prisma.ecommerce_mall_cart_itemsWhereInput = searchTerm
    ? {
        OR: [
          {
            productVariant: {
              product: {
                name: {
                  contains: searchTerm,
                  mode: "insensitive" as const,
                },
              },
            },
          },
          {
            productVariant: {
              sku_code: {
                contains: searchTerm,
                mode: "insensitive" as const,
              },
            },
          },
        ],
      }
    : {};
  const where: Prisma.ecommerce_mall_cart_itemsWhereInput = {
    ...baseWhere,
    ...searchWhere,
  };
  // Build order by based on sort parameter
  const orderBy: Prisma.ecommerce_mall_cart_itemsOrderByWithRelationInput =
    (() => {
      switch (props.body.sort) {
        case "product_name":
          return {
            productVariant: {
              product: {
                name: "asc" as const,
              },
            },
          };
        case "price":
          return {
            productVariant: {
              price: "asc" as const,
            },
          };
        case "created_at":
        default:
          return {
            created_at: "desc" as const,
          };
      }
    })();
  // Execute queries
  const data = await MyGlobal.prisma.ecommerce_mall_cart_items.findMany({
    where,
    orderBy,
    skip,
    take: limit,
    ...EcommerceMallCartItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_cart_items.count({
    where,
  });
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    data,
    EcommerceMallCartItemAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  };
}
