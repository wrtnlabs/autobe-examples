import { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerOrdersOrderIdItemsItemIdVariantSnapshots(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshot.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshot.ISummary> {
  // Verify order exists and belongs to customer
  await MyGlobal.prisma.ecommerce_mall_orders.findFirstOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Verify order item exists and get variant_id
  const orderItem =
    await MyGlobal.prisma.ecommerce_mall_order_items.findFirstOrThrow({
      where: {
        id: props.itemId,
        order_id: props.orderId,
      },
      select: {
        id: true,
        variant_id: true,
      },
    });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build date filter
  const dateWhere: {
    gte?: Date;
    lte?: Date;
  } = {};
  if (
    props.body.createdAtFrom !== undefined &&
    props.body.createdAtFrom !== null
  ) {
    dateWhere.gte = new Date(props.body.createdAtFrom);
  }
  if (props.body.createdAtTo !== undefined && props.body.createdAtTo !== null) {
    dateWhere.lte = new Date(props.body.createdAtTo);
  }
  const where = {
    product_variant_id: orderItem.variant_id,
    ...(Object.keys(dateWhere).length > 0 && {
      created_at: dateWhere,
    }),
  } satisfies Prisma.ecommerce_mall_product_variant_snapshotsWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        product_variant_id: true,
        sku_code: true,
        price: true,
        created_at: true,
        optionValues: {
          select: {
            option_name: true,
            option_value: true,
          },
        },
      },
    });
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.count({
      where,
    });
  const data = await ArrayUtil.asyncMap(
    records,
    async (record): Promise<IEcommerceMallProductVariantSnapshot.ISummary> => {
      const optionValues: Record<string, string> = {};
      for (const ov of record.optionValues) {
        optionValues[ov.option_name] = ov.option_value;
      }
      return {
        id: record.id as string & tags.Format<"uuid">,
        variantId: record.product_variant_id as string & tags.Format<"uuid">,
        skuCode: record.sku_code,
        price: record.price,
        optionValues,
        createdAt: record.created_at.toISOString() as string &
          tags.Format<"date-time">,
      };
    },
  );
  return {
    data,
    pagination: {
      current: page satisfies number,
      limit: limit satisfies number,
      records: total satisfies number,
      pages: Math.ceil(total / limit) satisfies number,
    } satisfies IPage.IPagination,
  };
}
