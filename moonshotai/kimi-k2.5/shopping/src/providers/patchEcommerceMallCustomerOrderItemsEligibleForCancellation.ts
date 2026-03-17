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

export async function patchEcommerceMallCustomerOrderItemsEligibleForCancellation(props: {
  customer: CustomerPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const order = props.body.order ?? "desc";
  const sort = props.body.sort ?? "created_at";
  const whereInput = {
    status: "paid" as const,
    order: {
      customer_id: props.customer.id,
    },
    ...(props.body.sellerId && { seller_id: props.body.sellerId }),
    ...(props.body.orderId && { order_id: props.body.orderId }),
    ...(props.body.productId && { product_id: props.body.productId }),
    ...(props.body.variantId && { variant_id: props.body.variantId }),
    ...(props.body.createdAtFrom && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
    ...(props.body.search && {
      product: {
        name: { contains: props.body.search, mode: "insensitive" as const },
      },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderByInput =
    sort === "created_at"
      ? { created_at: order }
      : sort === "status"
        ? { status: order }
        : sort === "seller_id"
          ? { seller_id: order }
          : sort === "price_at_purchase"
            ? { price_at_purchase: order }
            : sort === "quantity"
              ? { quantity: order }
              : { created_at: order };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallOrderItemAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({
      where: whereInput,
    }),
  ]);
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallOrderItemAtSummaryTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
