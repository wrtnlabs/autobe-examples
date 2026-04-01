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
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { MallPlatformOrderItemSnapshotAtSummaryTransformer } from "../transformers/MallPlatformOrderItemSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptions(props: {
  seller: SellerPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary> {
  await MyGlobal.prisma.mall_platform_order_item_snapshots.findUniqueOrThrow({
    where: {
      id: props.snapshotId,
      mall_platform_order_item_id: props.orderItemId,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where: Prisma.mall_platform_order_item_snapshot_variant_optionsWhereInput =
    {
      mall_platform_order_item_snapshot_id: props.snapshotId,
      deleted_at: null,
      ...(search === undefined || search.length === 0
        ? {}
        : {
            OR: [
              { option_name: { contains: search, mode: "insensitive" } },
              { option_value: { contains: search, mode: "insensitive" } },
            ],
          }),
    };
  const orderBy: Prisma.mall_platform_order_item_snapshot_variant_optionsOrderByWithRelationInput[] =
    props.body.sort === "option_name"
      ? [{ option_name: "asc" }, { id: "asc" }]
      : props.body.sort === "-option_name"
        ? [{ option_name: "desc" }, { id: "desc" }]
        : props.body.sort === "option_value"
          ? [{ option_value: "asc" }, { id: "asc" }]
          : props.body.sort === "-option_value"
            ? [{ option_value: "desc" }, { id: "desc" }]
            : props.body.sort === "-created_at"
              ? [{ created_at: "desc" }, { id: "desc" }]
              : [{ created_at: "asc" }, { id: "asc" }];
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
          orderItemSnapshot:
            MallPlatformOrderItemSnapshotAtSummaryTransformer.select(),
        } satisfies Prisma.mall_platform_order_item_snapshot_variant_optionsFindManyArgs["select"],
      },
    );
  const records =
    await MyGlobal.prisma.mall_platform_order_item_snapshot_variant_options.count(
      {
        where,
      },
    );
  return {
    data: await ArrayUtil.asyncMap(
      data,
      async (item) =>
        ({
          id: item.id,
          optionName: item.option_name,
          optionValue: item.option_value,
          createdAt: item.created_at.toISOString(),
          updatedAt: item.updated_at.toISOString(),
          deletedAt: item.deleted_at?.toISOString() ?? null,
        }) satisfies IMallPlatformOrderItemSnapshotVariantOption.ISummary,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: records === 0 ? 0 : Math.ceil(records / limit),
    },
  };
}
