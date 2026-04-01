import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariantSnapshotOption";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformProductVariantSnapshotOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformProductVariantSnapshotOption";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformSellerProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
  seller: SellerPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshotOption.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
  await MyGlobal.prisma.mall_platform_product_variant_snapshots.findFirstOrThrow(
    {
      where: {
        id: props.snapshotId,
        mall_platform_product_id: props.productId,
      },
      select: {
        id: true,
      },
    },
  );
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany(
      {
        where: {
          mall_platform_product_variant_snapshot_id: props.snapshotId,
          ...(props.body.search === undefined
            ? {}
            : {
                OR: [
                  {
                    option_key: {
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
              }),
        },
        skip,
        take: limit,
        orderBy: [{ option_key: "asc" }, { id: "asc" }],
        select: {
          id: true,
          option_key: true,
          option_value: true,
        },
      },
    );
  const total: number =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.count({
      where: {
        mall_platform_product_variant_snapshot_id: props.snapshotId,
        ...(props.body.search === undefined
          ? {}
          : {
              OR: [
                {
                  option_key: {
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
            }),
      },
    });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: records.map((record) => ({
      id: record.id,
      optionKey: record.option_key,
      optionValue: record.option_value,
    })),
  };
}
