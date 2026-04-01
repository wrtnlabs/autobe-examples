import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItemSnapshotVariantOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformOrderItemSnapshotVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformOrderItemSnapshotVariantOption";
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

export async function patchMallPlatformCustomerOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptions(props: {
  customer: CustomerPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const snapshot =
    await MyGlobal.prisma.mall_platform_order_item_snapshots.findFirstOrThrow({
      where: {
        id: props.snapshotId,
        mall_platform_order_item_id: props.orderItemId,
      },
      select: {
        id: true,
        mall_platform_order_item_id: true,
      },
    });
  if (snapshot.mall_platform_order_item_id !== props.orderItemId) {
    throw new HttpException("Forbidden", 403);
  }
  const where: Prisma.mall_platform_order_item_snapshot_variant_optionsWhereInput =
    {
      mall_platform_order_item_snapshot_id: snapshot.id,
      deleted_at: null,
      ...(props.body.search !== undefined && props.body.search !== null
        ? {
            OR: [
              {
                option_name: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
              {
                option_value: {
                  contains: props.body.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {}),
    };
  const orderBy: Prisma.mall_platform_order_item_snapshot_variant_optionsOrderByWithRelationInput =
    props.body.sort === "created_at_asc"
      ? { created_at: "asc" }
      : props.body.sort === "created_at_desc"
        ? { created_at: "desc" }
        : { id: "asc" };
  const data =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          option_name: true,
          option_value: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  const total =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.count(
      {
        where,
      },
    );
  return {
    data: data.map((row) => ({
      id: row.id,
      optionName: row.option_name,
      optionValue: row.option_value,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
      deletedAt: row.deleted_at === null ? null : row.deleted_at.toISOString(),
    })),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
  };
}
