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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallOrderAtSummaryTransformer } from "../transformers/EcommerceMallOrderAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminOrderItems(props: {
  admin: AdminPayload;
  body: IEcommerceMallOrderItem.IRequest;
}): Promise<IPageIEcommerceMallOrderItem.ISummary> {
  const page = Math.max(1, props.body.page ?? 1);
  const limit = Math.min(100, Math.max(1, props.body.limit ?? 100));
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_order_itemsWhereInput = {
    deleted_at:
      props.body.include_deleted === true
        ? undefined
        : props.body.include_deleted === false
          ? null
          : null,
    ...(props.body.order_id !== undefined && {
      ecommerce_mall_order_id: props.body.order_id,
    }),
    ...(props.body.product_id !== undefined && {
      ecommerce_mall_product_id: props.body.product_id,
    }),
    ...(props.body.product_variant_id !== undefined && {
      ecommerce_mall_product_variant_id: props.body.product_variant_id,
    }),
    ...(props.body.item_status !== undefined && {
      item_status: props.body.item_status,
    }),
    ...(props.body.created_at_from !== undefined && {
      created_at: { gte: props.body.created_at_from },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: { lte: props.body.created_at_to },
    }),
    ...(props.body.updated_at_from !== undefined && {
      updated_at: { gte: props.body.updated_at_from },
    }),
    ...(props.body.updated_at_to !== undefined && {
      updated_at: { lte: props.body.updated_at_to },
    }),
  } satisfies Prisma.ecommerce_mall_order_itemsWhereInput;
  const orderByInput =
    props.body.sort === "created_at"
      ? {
          created_at:
            props.body.order === "DESC" ? "desc" : ("asc" as Prisma.SortOrder),
        }
      : props.body.sort === "updated_at"
        ? {
            updated_at:
              props.body.order === "DESC"
                ? "desc"
                : ("asc" as Prisma.SortOrder),
          }
        : props.body.sort === "unit_price"
          ? {
              unit_price:
                props.body.order === "DESC"
                  ? "desc"
                  : ("asc" as Prisma.SortOrder),
            }
          : props.body.sort === "quantity"
            ? {
                quantity:
                  props.body.order === "DESC"
                    ? "desc"
                    : ("asc" as Prisma.SortOrder),
              }
            : { created_at: "desc" as Prisma.SortOrder };
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_order_items.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      include: {
        order: EcommerceMallOrderAtSummaryTransformer.select(),
      },
    }),
    MyGlobal.prisma.ecommerce_mall_order_items.count({ where: whereInput }),
  ]);
  const transformedData = await ArrayUtil.asyncMap(
    data,
    async (item) =>
      ({
        id: item.id,
        order: await EcommerceMallOrderAtSummaryTransformer.transform(
          (item as any).order,
        ),
        quantity: item.quantity,
        unitPrice: item.unit_price,
        itemStatus: typia.assert<
          "shipped" | "delivered" | "cancelled" | "paid" | "refunded"
        >(item.item_status),
        created_at: toISOStringSafe(item.created_at),
        updated_at: toISOStringSafe(item.updated_at),
        productSnapshot: item.product_snapshot,
        variantSnapshot: item.variant_snapshot,
        sellerProfileSnapshot: item.seller_profile_snapshot,
      }) satisfies IEcommerceMallOrderItem.ISummary,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIEcommerceMallOrderItem.ISummary;
}
