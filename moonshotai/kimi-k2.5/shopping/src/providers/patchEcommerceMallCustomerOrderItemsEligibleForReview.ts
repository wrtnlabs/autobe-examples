import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrderItemsEligibleForReview(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const baseWhere: Prisma.ecommerce_mall_order_itemsWhereInput = {
    status: "delivered",
    deleted_at: null,
    order: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
    review: {
      is: null,
    },
  };
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    ...baseWhere,
    ...(props.body.sellerId !== undefined && {
      seller_id: props.body.sellerId,
    }),
    ...(props.body.orderId !== undefined && {
      order_id: props.body.orderId,
    }),
    ...(props.body.productId !== undefined && {
      product_id: props.body.productId,
    }),
    ...(props.body.variantId !== undefined && {
      variant_id: props.body.variantId,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: props.body.createdAtFrom },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: {
        lte: props.body.createdAtTo,
      },
    }),
    ...(props.body.createdAtFrom !== undefined &&
      props.body.createdAtTo !== undefined && {
        created_at: {
          gte: props.body.createdAtFrom,
          lte: props.body.createdAtTo,
        },
      }),
    ...(props.body.search !== undefined && {
      product: {
        name: { contains: props.body.search, mode: "insensitive" as const },
      },
    }),
  };
  const sortField = props.body.sort ?? "created_at";
  const sortDirection = props.body.order ?? "desc";
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput =
    sortField === "seller_id"
      ? { seller_id: sortDirection }
      : sortField === "price_at_purchase"
        ? { price_at_purchase: sortDirection }
        : sortField === "quantity"
          ? { quantity: sortDirection }
          : sortField === "status"
            ? { status: sortDirection }
            : { created_at: sortDirection };
  const data = await MyGlobal.prisma.ecommerce_mall_order_items.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    ...EcommerceMallOrderItemAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_mall_order_items.count({
    where: whereInput,
  });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
