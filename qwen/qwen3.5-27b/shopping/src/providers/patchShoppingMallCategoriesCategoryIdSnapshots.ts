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
import { ShoppingMallCategorySnapshotAtSummaryTransformer } from "../transformers/ShoppingMallCategorySnapshotAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCategoriesCategoryIdSnapshots(props: {
  categoryId: string & tags.Format<"uuid">;
  body: IShoppingMallCategorySnapshot.IRequest;
}): Promise<IPageIShoppingMallCategorySnapshot.ISummary> {
  // Verify category exists
  await MyGlobal.prisma.shopping_mall_categories.findUniqueOrThrow({
    where: { id: props.categoryId },
  });
  // Pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const validatedPage = page < 1 ? 1 : page;
  // Build where clause
  const whereInput: Prisma.shopping_mall_category_snapshotsWhereInput = {
    shopping_mall_category_id: props.categoryId,
  };
  // Apply date range filters
  const createdAtFilter: Partial<Prisma.DateTimeFilter> = {};
  if (props.body.created_at_from !== undefined) {
    createdAtFilter.gte = new Date(props.body.created_at_from);
  }
  if (props.body.created_at_to !== undefined) {
    createdAtFilter.lte = new Date(props.body.created_at_to);
  }
  if (Object.keys(createdAtFilter).length > 0) {
    whereInput.created_at = createdAtFilter as Prisma.DateTimeFilter;
  }
  // Fetch all matching snapshots (without pagination for change_type filtering)
  const allData =
    await MyGlobal.prisma.shopping_mall_category_snapshots.findMany({
      where: whereInput,
      orderBy: { created_at: "desc" },
      ...ShoppingMallCategorySnapshotAtSummaryTransformer.select(),
    });
  // Filter by change_type in application layer
  const filteredData = props.body.change_type
    ? allData.filter((snapshot) => {
        switch (props.body.change_type) {
          case "name":
            return snapshot.name_before !== snapshot.name_after;
          case "description":
            return snapshot.description_before !== snapshot.description_after;
          case "parent_category":
            return (
              snapshot.parent_category_id_before !==
              snapshot.parent_category_id_after
            );
          default:
            return true;
        }
      })
    : allData;
  // Apply pagination
  const skip = (validatedPage - 1) * limit;
  const paginatedData = filteredData.slice(skip, skip + limit);
  // Transform results
  const transformedData = await ArrayUtil.asyncMap(
    paginatedData,
    ShoppingMallCategorySnapshotAtSummaryTransformer.transform,
  );
  return {
    data: transformedData,
    pagination: {
      current: validatedPage,
      limit: limit,
      records: filteredData.length,
      pages: Math.ceil(filteredData.length / limit),
    },
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
// import { IShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategorySnapshot";
// import { IPageIShoppingMallCategorySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCategorySnapshot";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCategoriesCategoryIdSnapshots(props: {
//   categoryId: string & tags.Format<"uuid">;
//   body: IShoppingMallCategorySnapshot.IRequest;
// }): Promise<IPageIShoppingMallCategorySnapshot.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_category_snapshots.findMany({
//     ...ShoppingMallCategorySnapshotAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCategorySnapshotAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------