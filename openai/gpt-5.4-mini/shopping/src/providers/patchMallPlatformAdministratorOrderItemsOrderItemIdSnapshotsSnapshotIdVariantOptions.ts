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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorOrderItemsOrderItemIdSnapshotsSnapshotIdVariantOptions(props: {
  administrator: AdministratorPayload;
  orderItemId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformOrderItemSnapshotVariantOption.IRequest;
}): Promise<IPageIMallPlatformOrderItemSnapshotVariantOption.ISummary> {
  await MyGlobal.prisma.mall_platform_order_item_snapshots.findFirstOrThrow({
    where: {
      id: props.snapshotId,
      mall_platform_order_item_id: props.orderItemId,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search?.trim();
  const where: Prisma.mall_platform_order_item_snapshot_variant_optionsWhereInput =
    {
      mall_platform_order_item_snapshot_id: props.snapshotId,
      ...(search === undefined || search.length === 0
        ? {}
        : {
            OR: [
              { option_name: { contains: search, mode: "insensitive" } },
              { option_value: { contains: search, mode: "insensitive" } },
            ],
          }),
    };
  const orderBy: Prisma.mall_platform_order_item_snapshot_variant_optionsOrderByWithRelationInput =
    props.body.sort === "option_name"
      ? { option_name: "asc" }
      : props.body.sort === "-option_name"
        ? { option_name: "desc" }
        : props.body.sort === "option_value"
          ? { option_value: "asc" }
          : props.body.sort === "-option_value"
            ? { option_value: "desc" }
            : { created_at: "asc" };
  const records =
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
    pagination: {
      current: page,
      limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    },
    data: records.map(
      (record): IMallPlatformOrderItemSnapshotVariantOption.ISummary => ({
        id: record.id,
        optionName: record.option_name,
        optionValue: record.option_value,
        createdAt: record.created_at.toISOString(),
        updatedAt: record.updated_at.toISOString(),
        deletedAt:
          record.deleted_at === null ? null : record.deleted_at.toISOString(),
      }),
    ),
  };
}
