import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
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

export async function patchShoppingMallAdministratorCategoriesCategoryIdSnapshots(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategorySnapshot.IRequest;
}): Promise<IPageIShoppingMallCategorySnapshot.ISummary> {
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_category_snapshotsWhereInput = {
    shopping_mall_category_id: props.categoryId,
    ...(props.body.createdAfter && {
      created_at: { gt: new Date(props.body.createdAfter) },
    }),
    ...(props.body.createdBefore && {
      created_at: { lt: new Date(props.body.createdBefore) },
    }),
  } satisfies Prisma.shopping_mall_category_snapshotsWhereInput;
  const orderByInput: Prisma.shopping_mall_category_snapshotsOrderByWithRelationInput =
    (
      props.body.sortBy === "created_at_asc"
        ? { created_at: "asc" as const }
        : { created_at: "desc" as const }
    ) satisfies Prisma.shopping_mall_category_snapshotsOrderByWithRelationInput;
  const data = await MyGlobal.prisma.shopping_mall_category_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    select: {
      id: true,
      name: true,
      description: true,
      parent_id: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.shopping_mall_category_snapshots.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: data.map(
      (snapshot) =>
        ({
          id: snapshot.id,
          name: snapshot.name,
          description: snapshot.description,
          parent_id: snapshot.parent_id,
          created_at: snapshot.created_at.toISOString(),
        }) satisfies IShoppingMallCategorySnapshot.ISummary,
    ),
  } satisfies IPageIShoppingMallCategorySnapshot.ISummary;
}
