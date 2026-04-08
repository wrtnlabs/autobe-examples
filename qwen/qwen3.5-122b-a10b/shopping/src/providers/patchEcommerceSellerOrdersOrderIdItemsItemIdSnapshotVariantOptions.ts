import { IEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItemSnapshotVariantOption";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceOrderItemSnapshotVariantOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer } from "../transformers/EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceSellerOrdersOrderIdItemsItemIdSnapshotVariantOptions(props: {
  seller: SellerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  body: IEcommerceOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIEcommerceOrderItemSnapshotVariantOption.ISummary> {
  const orderItem =
    await MyGlobal.prisma.ecommerce_order_items.findUniqueOrThrow({
      where: { id: props.itemId },
      select: {
        ecommerce_order_id: true,
        ecommerce_product_variant_id: true,
        ecommerce_seller_id: true,
      },
    });
  if (orderItem.ecommerce_order_id !== props.orderId) {
    throw new HttpException("Order item not found in specified order", 404);
  }
  if (orderItem.ecommerce_seller_id !== props.seller.id) {
    throw new HttpException("Forbidden", 403);
  }
  const whereInput: Prisma.ecommerce_order_item_snapshot_variant_optionsWhereInput =
    {
      ecommerceOrderItemSnapshotVariant: {
        ecommerceOrderItemSnapshot: {
          ecommerce_order_item_id: props.itemId,
        },
      },
      ...(props.body.key !== undefined && {
        key: props.body.key,
      }),
    };
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 100, 100);
  const offset = props.body.offset ?? (page - 1) * limit;
  const records =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.findMany(
      {
        where: whereInput,
        skip: offset,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.select(),
      },
    );
  const total =
    await MyGlobal.prisma.ecommerce_order_item_snapshot_variant_options.count({
      where: whereInput,
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceOrderItemSnapshotVariantOptionAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceOrderItemSnapshotVariantOption.ISummary;
}
