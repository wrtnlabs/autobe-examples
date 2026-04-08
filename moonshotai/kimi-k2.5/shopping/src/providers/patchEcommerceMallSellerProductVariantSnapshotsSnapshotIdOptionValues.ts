import { IEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshotOptionValue";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallProductVariantSnapshotOptionValue";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallProductVariantSnapshotOptionValueTransformer } from "../transformers/EcommerceMallProductVariantSnapshotOptionValueTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellerProductVariantSnapshotsSnapshotIdOptionValues(props: {
  seller: SellerPayload;
  snapshotId: string & tags.Format<"uuid">;
  body: IEcommerceMallProductVariantSnapshotOptionValue.IRequest;
}): Promise<IPageIEcommerceMallProductVariantSnapshotOptionValue> {
  // Verify snapshot exists
  await MyGlobal.prisma.ecommerce_mall_product_variant_snapshots.findUniqueOrThrow(
    {
      where: { id: props.snapshotId },
    },
  );
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause with filters
  const whereInput: Prisma.ecommerce_mall_product_variant_snapshot_option_valuesWhereInput =
    {
      ecommerce_mall_product_variant_snapshot_id: props.snapshotId,
      ...(props.body.optionName && {
        option_name: {
          contains: props.body.optionName,
          mode: "insensitive" as const,
        },
      }),
      ...(props.body.optionValue && {
        option_value: {
          contains: props.body.optionValue,
          mode: "insensitive" as const,
        },
      }),
    };
  // Query data with pagination
  const data =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.findMany(
      {
        where: whereInput,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        ...EcommerceMallProductVariantSnapshotOptionValueTransformer.select(),
      },
    );
  // Get total count
  const total =
    await MyGlobal.prisma.ecommerce_mall_product_variant_snapshot_option_values.count(
      {
        where: whereInput,
      },
    );
  // Transform results
  const transformed = await ArrayUtil.asyncMap(
    data,
    EcommerceMallProductVariantSnapshotOptionValueTransformer.transform,
  );
  return {
    data: transformed,
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
