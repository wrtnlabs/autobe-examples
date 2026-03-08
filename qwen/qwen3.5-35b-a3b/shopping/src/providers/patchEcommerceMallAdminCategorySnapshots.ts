import { IEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallCategorySnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCategorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminCategorySnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceMallCategorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallCategorySnapshot.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_category_snapshotsWhereInput = {
    ...(props.body.ecommerceMallCategoryId !== undefined && {
      ecommerce_mall_category_id: props.body.ecommerceMallCategoryId,
    }),
    ...(props.body.snapshotCreatedAtMin !== undefined && {
      snapshot_created_at: { gte: new Date(props.body.snapshotCreatedAtMin) },
    }),
    ...(props.body.snapshotCreatedAtMax !== undefined && {
      snapshot_created_at: { lte: new Date(props.body.snapshotCreatedAtMax) },
    }),
  };
  const sortOrder: Prisma.SortOrder =
    props.body.sortOrder === "ascending" ? "asc" : "desc";
  let orderByInput: Prisma.ecommerce_mall_category_snapshotsOrderByWithRelationInput;
  if (props.body.sort === "snapshotCreatedAt") {
    orderByInput = { snapshot_created_at: sortOrder };
  } else if (props.body.sort === "id") {
    orderByInput = { id: sortOrder };
  } else {
    orderByInput = { snapshot_created_at: "desc" as Prisma.SortOrder };
  }
  const [data, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_category_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: [orderByInput],
      ...EcommerceMallCategorySnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_category_snapshots.count({
      where: whereInput,
    }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      data,
      EcommerceMallCategorySnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
