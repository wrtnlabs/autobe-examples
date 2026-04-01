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

export async function patchEcommerceMallAdminCategoriesCategoryIdSnapshots(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategorySnapshot.IRequest;
}): Promise<IPageIEcommerceMallCategorySnapshot.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 20;
  const skip: number = (page - 1) * limit;
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  const [snapshots, total]: [
    Array<
      Prisma.ecommerce_mall_category_snapshotsGetPayload<
        ReturnType<
          typeof EcommerceMallCategorySnapshotAtSummaryTransformer.select
        >
      >
    >,
    number,
  ] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_category_snapshots.findMany({
      where: {
        snapshot_id: props.categoryId,
        ...(props.body.from_date && {
          created_at: {
            gte: new Date(props.body.from_date),
          },
        }),
        ...(props.body.to_date && {
          created_at: {
            lte: new Date(props.body.to_date),
          },
        }),
        ...(props.body.search && {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            { slug: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      } satisfies Prisma.ecommerce_mall_category_snapshotsWhereInput,
      orderBy:
        props.body.sort === "name"
          ? { name: "asc" }
          : props.body.sort === "category"
            ? { snapshot_id: "asc" }
            : props.body.sort === "slug"
              ? { slug: "asc" }
              : { created_at: "desc" },
      skip,
      take: limit,
      ...EcommerceMallCategorySnapshotAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_category_snapshots.count({
      where: {
        snapshot_id: props.categoryId,
        ...(props.body.from_date && {
          created_at: {
            gte: new Date(props.body.from_date),
          },
        }),
        ...(props.body.to_date && {
          created_at: {
            lte: new Date(props.body.to_date),
          },
        }),
        ...(props.body.search && {
          OR: [
            { name: { contains: props.body.search, mode: "insensitive" } },
            { slug: { contains: props.body.search, mode: "insensitive" } },
            {
              description: { contains: props.body.search, mode: "insensitive" },
            },
          ],
        }),
      } satisfies Prisma.ecommerce_mall_category_snapshotsWhereInput,
    }),
  ]);
  const data: IEcommerceMallCategorySnapshot.ISummary[] =
    await ArrayUtil.asyncMap(
      snapshots,
      EcommerceMallCategorySnapshotAtSummaryTransformer.transform,
    );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data,
  } satisfies IPageIEcommerceMallCategorySnapshot.ISummary;
}
