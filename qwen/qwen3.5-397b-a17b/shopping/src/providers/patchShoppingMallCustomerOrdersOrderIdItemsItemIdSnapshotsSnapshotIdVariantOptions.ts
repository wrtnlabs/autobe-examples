import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderItemSnapshotVariantOption";
import { IShoppingMallOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItemSnapshotVariantOption";
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

export async function patchShoppingMallCustomerOrdersOrderIdItemsItemIdSnapshotsSnapshotIdVariantOptions(props: {
  customer: CustomerPayload;
  orderId: string & tags.Format<"uuid">;
  itemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IShoppingMallOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIShoppingMallOrderItemSnapshotVariantOption.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 10;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.shopping_mall_orders.findUniqueOrThrow({
    where: {
      id: props.orderId,
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_order_items.findUniqueOrThrow({
    where: {
      id: props.itemId,
      shopping_mall_order_id: props.orderId,
      deleted_at: null,
    },
  });
  await MyGlobal.prisma.shopping_mall_order_item_snapshots.findUniqueOrThrow({
    where: {
      id: props.snapshotId,
      shopping_mall_order_item_id: props.itemId,
    },
  });
  const whereCondition: Prisma.shopping_mall_order_item_snapshot_variant_optionsWhereInput =
    {
      order_item_snapshot_id: props.snapshotId,
    };
  const sortFields = props.body.sort ?? ["createdAt"];
  const orderByConditions: Prisma.shopping_mall_order_item_snapshot_variant_optionsOrderByWithRelationInput[] =
    [];
  for (const field of sortFields) {
    if (field === "optionName") {
      orderByConditions.push({
        productOptionValue: {
          optionDefinition: {
            name: "asc",
          },
        },
      });
    } else if (field === "optionValue") {
      orderByConditions.push({
        productOptionValue: {
          name: "asc",
        },
      });
    } else if (field === "createdAt") {
      orderByConditions.push({
        created_at: "desc",
      });
    }
  }
  if (orderByConditions.length === 0) {
    orderByConditions.push({
      created_at: "desc",
    });
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.findMany({
      where: whereCondition,
      skip,
      take: limit,
      orderBy: orderByConditions,
      select: {
        id: true,
        created_at: true,
        productOptionValue: {
          select: {
            id: true,
            name: true,
            optionDefinition: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    }),
    MyGlobal.prisma.shopping_mall_order_item_snapshot_variant_options.count({
      where: whereCondition,
    }),
  ]);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (item) =>
        ({
          id: item.id,
          optionName: item.productOptionValue.optionDefinition.name,
          optionValue: item.productOptionValue.name,
          createdAt: item.created_at.toISOString(),
        }) satisfies IShoppingMallOrderItemSnapshotVariantOption.ISummary,
    ),
  } satisfies IPageIShoppingMallOrderItemSnapshotVariantOption.ISummary;
}
