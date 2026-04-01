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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformProductVariantSnapshotOptionAtSummaryTransformer } from "../transformers/MallPlatformProductVariantSnapshotOptionAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorProductsProductIdVariantSnapshotsSnapshotIdOptions(props: {
  administrator: AdministratorPayload;
  productId: string & tags.Format<"uuid">;
  snapshotId: string & tags.Format<"uuid">;
  body: IMallPlatformProductVariantSnapshotOption.IRequest;
}): Promise<IPageIMallPlatformProductVariantSnapshotOption.ISummary> {
  const snapshot =
    await MyGlobal.prisma.mall_platform_product_variant_snapshots.findUniqueOrThrow(
      {
        where: {
          id: props.snapshotId,
        },
        select: {
          id: true,
          mall_platform_product_id: true,
        },
      },
    );
  if (snapshot.mall_platform_product_id !== props.productId) {
    throw new HttpException("Not Found", 404);
  }
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where: Prisma.mall_platform_product_variant_snapshot_optionsWhereInput =
    {
      mall_platform_product_variant_snapshot_id: props.snapshotId,
      ...(props.body.search !== undefined
        ? {
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
          }
        : {}),
    };
  const orderBy: Prisma.mall_platform_product_variant_snapshot_optionsOrderByWithRelationInput[] =
    props.body.sort === "option_value_desc"
      ? [{ option_value: "desc" }, { id: "asc" }]
      : props.body.sort === "option_value_asc"
        ? [{ option_value: "asc" }, { id: "asc" }]
        : props.body.sort === "option_key_desc"
          ? [{ option_key: "desc" }, { id: "asc" }]
          : props.body.sort === "id_desc"
            ? [{ id: "desc" }]
            : [{ option_key: "asc" }, { id: "asc" }];
  const data =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.findMany(
      {
        where,
        skip,
        take: limit,
        orderBy,
        ...MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.select(),
      },
    );
  const records =
    await MyGlobal.prisma.mall_platform_product_variant_snapshot_options.count({
      where,
    });
  return {
    data: await ArrayUtil.asyncMap(
      data,
      MallPlatformProductVariantSnapshotOptionAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  };
}
