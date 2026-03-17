import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallCategorySnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCategorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallAdministratorCategoriesCategoryIdSnapshots(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategorySnapshot.IRequest;
}): Promise<IPageIShoppingMallCategorySnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: {
      id: props.categoryId,
    },
    select: {
      id: true,
    },
  });
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const where = {
    shopping_mall_category_id: props.categoryId,
    ...(props.body.search !== undefined && props.body.search.length !== 0
      ? {
          change_summary: {
            contains: props.body.search,
            mode: "insensitive",
          },
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: props.body.createdAtFrom }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: props.body.createdAtTo }
              : {}),
          },
        }
      : {}),
  } satisfies Prisma.shopping_mall_category_snapshotsWhereInput;
  const orderBy = (
    props.body.sort === "created_at.asc"
      ? [
          {
            created_at: "asc",
          },
          {
            id: "asc",
          },
        ]
      : [
          {
            created_at: "desc",
          },
          {
            id: "desc",
          },
        ]
  ) satisfies Prisma.shopping_mall_category_snapshotsOrderByWithRelationInput[];
  const records =
    await MyGlobal.prisma.shopping_mall_category_snapshots.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      ...ShoppingMallCategorySnapshotAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_category_snapshots.count({
    where,
  });
  return {
    data: await ArrayUtil.asyncMap(
      records,
      ShoppingMallCategorySnapshotAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  };
}
