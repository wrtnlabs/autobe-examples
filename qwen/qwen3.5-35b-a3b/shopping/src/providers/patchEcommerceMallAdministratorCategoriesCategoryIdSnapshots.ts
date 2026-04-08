import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoriesSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { EcommerceMallCategoriesSnapshotAtSummaryTransformer } from "../transformers/EcommerceMallCategoriesSnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdministratorCategoriesCategoryIdSnapshots(props: {
  administrator: AdministratorPayload;
  categoryId: string & tags.Format<"uuid">;
  body: IEcommerceMallCategoriesSnapshot.IRequest;
}): Promise<IPageIEcommerceMallCategoriesSnapshot.ISummary> {
  // Validate categoryId exists
  await MyGlobal.prisma.ecommerce_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  // Extract pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build where clause using ISO strings directly (no Date type)
  const whereInput: Prisma.ecommerce_mall_categories_snapshotsWhereInput = {
    category_id: props.categoryId,
    entity_type: "category",
    ...(props.body.created_at_start !== undefined && {
      created_at: { gte: props.body.created_at_start },
    }),
    ...(props.body.created_at_end !== undefined && {
      created_at: { lte: props.body.created_at_end },
    }),
    ...(props.body.modified_by_id !== undefined && {
      modified_by_id: props.body.modified_by_id,
    }),
  } satisfies Prisma.ecommerce_mall_categories_snapshotsWhereInput;
  // Build orderBy with proper type handling
  let orderByInput: Prisma.ecommerce_mall_categories_snapshotsOrderByWithRelationInput[];
  if (props.body.sort_by === "name") {
    orderByInput = [
      {
        name: props.body.sort_order === "asc" ? "asc" : "desc",
      },
    ];
  } else if (props.body.sort_by === "modified_by_id") {
    orderByInput = [
      {
        modified_by_id: props.body.sort_order === "asc" ? "asc" : "desc",
      },
    ];
  } else if (props.body.sort_by === "description") {
    orderByInput = [
      {
        description: props.body.sort_order === "asc" ? "asc" : "desc",
      },
    ];
  } else {
    // Default: sort by created_at descending
    orderByInput = [
      {
        created_at: props.body.sort_order === "asc" ? "asc" : "desc",
      },
    ];
  }
  orderByInput =
    orderByInput satisfies Prisma.ecommerce_mall_categories_snapshotsOrderByWithRelationInput[];
  // Query snapshots
  const records =
    await MyGlobal.prisma.ecommerce_mall_categories_snapshots.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommerceMallCategoriesSnapshotAtSummaryTransformer.select(),
    });
  // Count total
  const total = await MyGlobal.prisma.ecommerce_mall_categories_snapshots.count(
    {
      where: whereInput,
    },
  );
  // Transform and return
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallCategoriesSnapshotAtSummaryTransformer.transform,
  );
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data,
  };
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategoriesSnapshot";
// import { IPageIEcommerceMallCategoriesSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategoriesSnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallAdministratorCategoriesCategoryIdSnapshots(props: {
//   administrator: AdministratorPayload;
//   categoryId: string & tags.Format<"uuid">;
//   body: IEcommerceMallCategoriesSnapshot.IRequest;
// }): Promise<IPageIEcommerceMallCategoriesSnapshot.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_categories_snapshots.findMany({
//     ...EcommerceMallCategoriesSnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCategoriesSnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------