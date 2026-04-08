import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceSellerSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceSellerSnapshotAtSummaryTransformer } from "../transformers/EcommerceSellerSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminSnapshots(props: {
  admin: AdminPayload;
  body: IEcommerceSellerSnapshot.IRequest;
}): Promise<IPageIEcommerceSellerSnapshot.ISummary> {
  const page: number & tags.Type<"int32"> & tags.Minimum<1> =
    props.body.page ?? 1;
  const limit: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_seller_snapshotsWhereInput = {
    ...(props.body.fromDate !== undefined && {
      created_at: {
        gte: new Date(props.body.fromDate),
      } satisfies Prisma.DateTimeFilter,
    }),
    ...(props.body.toDate !== undefined && {
      created_at: {
        lte: new Date(props.body.toDate),
      } satisfies Prisma.DateTimeFilter,
    }),
    ...(props.body.sellerId !== undefined && {
      ecommerce_seller_id: props.body.sellerId,
    }),
  } satisfies Prisma.ecommerce_seller_snapshotsWhereInput;
  const records = await MyGlobal.prisma.ecommerce_seller_snapshots.findMany({
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" as const },
    ...EcommerceSellerSnapshotAtSummaryTransformer.select(),
  });
  const total: number = await MyGlobal.prisma.ecommerce_seller_snapshots.count({
    where: whereInput,
  });
  const pages: number = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceSellerSnapshotAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceSellerSnapshot.ISummary;
}
