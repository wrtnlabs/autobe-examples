import { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItem";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallOrderItemAtSummaryTransformer } from "../transformers/EcommerceMallOrderItemAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerOrderItems(props: {
  seller: SellerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  // Get all product IDs owned by this seller
  const sellerProducts = await MyGlobal.prisma.ecommerce_mall_products.findMany(
    {
      where: {
        seller_id: props.seller.id,
        deleted_at: null,
        is_active: true,
      },
      select: { id: true },
    },
  );
  const productIds: (string & tags.Format<"uuid">)[] = sellerProducts.map(
    (p) => p.id,
  );
  if (productIds.length === 0) {
    return {
      data: [],
      pagination: {
        current: page,
        limit: limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
    };
  }
  // Build WHERE clause with type safety
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    ecommerce_mall_product_id: { in: productIds },
  };
  // Handle soft delete filtering
  if (props.body.include_deleted !== true) {
    whereInput.deleted_at = null;
  }
  // Add optional filters
  if (props.body.order_id !== undefined) {
    whereInput.ecommerce_mall_order_id = props.body.order_id;
  }
  if (props.body.product_id !== undefined) {
    whereInput.ecommerce_mall_product_id = props.body.product_id;
  }
  if (props.body.product_variant_id !== undefined) {
    whereInput.ecommerce_mall_product_variant_id =
      props.body.product_variant_id;
  }
  if (props.body.item_status !== undefined) {
    whereInput.item_status = props.body.item_status;
  }
  if (
    props.body.created_at_from !== undefined ||
    props.body.created_at_to !== undefined
  ) {
    const createdAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_order_items"> =
      {};
    if (props.body.created_at_from !== undefined) {
      createdAtFilter.gte = props.body.created_at_from;
    }
    if (props.body.created_at_to !== undefined) {
      createdAtFilter.lte = props.body.created_at_to;
    }
    whereInput.created_at = createdAtFilter;
  }
  if (
    props.body.updated_at_from !== undefined ||
    props.body.updated_at_to !== undefined
  ) {
    const updatedAtFilter: Prisma.DateTimeFilter<"ecommerce_mall_order_items"> =
      {};
    if (props.body.updated_at_from !== undefined) {
      updatedAtFilter.gte = props.body.updated_at_from;
    }
    if (props.body.updated_at_to !== undefined) {
      updatedAtFilter.lte = props.body.updated_at_to;
    }
    whereInput.updated_at = updatedAtFilter;
  }
  // Build ORDER BY with type safety
  const orderByInput: Prisma.ecommerce_mall_order_itemsOrderByWithRelationInput[] =
    [
      props.body.sort && props.body.order
        ? {
            [props.body.sort]: props.body.order === "ASC" ? "asc" : "desc",
          }
        : { created_at: "desc" },
    ];
  // Query data and count
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({ where: whereInput }),
  ]);
  const totalPages: number & tags.Type<"int32"> & tags.Minimum<0> =
    total === 0 ? 0 : Math.ceil(total / limit);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallOrderItemAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: totalPages,
    } satisfies IPage.IPagination,
  };
}
