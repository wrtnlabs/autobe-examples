import { IEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategorySnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceCategorySnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceCategorySnapshotAtSummaryTransformer } from "../transformers/EcommerceCategorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceAdminCategoriesCategoryIdSnapshots(props: {
  admin: AdminPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceCategorySnapshot.IRequest;
}): Promise<IPageIEcommerceCategorySnapshot.ISummary> {
  await MyGlobal.prisma.ecommerce_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  const page = props.body.page ?? 1;
  const limit = Math.min(props.body.limit ?? 20, 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_category_snapshotsWhereInput = {
    ecommerce_category_id: props.categoryId,
    ...(props.body.created_at_from !== undefined && {
      created_at: {
        gte: new Date(props.body.created_at_from),
      },
    }),
    ...(props.body.created_at_to !== undefined && {
      created_at: {
        lte: new Date(props.body.created_at_to),
      },
    }),
  } satisfies Prisma.ecommerce_category_snapshotsWhereInput;
  const orderByInput: Prisma.ecommerce_category_snapshotsOrderByWithRelationInput =
    props.body.sort_by !== undefined
      ? ({
          [props.body.sort_by]: props.body.sort_order ?? "desc",
        } satisfies Prisma.ecommerce_category_snapshotsOrderByWithRelationInput)
      : ({
          created_at: "desc",
        } satisfies Prisma.ecommerce_category_snapshotsOrderByWithRelationInput);
  const records = await MyGlobal.prisma.ecommerce_category_snapshots.findMany({
    where: whereInput,
    orderBy: orderByInput,
    skip,
    take: limit,
    ...EcommerceCategorySnapshotAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_category_snapshots.count({
    where: whereInput,
  });
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceCategorySnapshotAtSummaryTransformer.transform,
  );
  const pages = Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    },
    data: data,
  } satisfies IPageIEcommerceCategorySnapshot.ISummary;
}
