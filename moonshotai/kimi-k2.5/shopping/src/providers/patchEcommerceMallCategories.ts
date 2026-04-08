import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallCategoryAtSummaryTransformer } from "../transformers/EcommerceMallCategoryAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

interface CursorData {
  createdAt: string & tags.Format<"date-time">;
  id: string & tags.Format<"uuid">;
}
function parseCursor(
  cursor: string | null | undefined,
): CursorData | undefined {
  if (cursor === null || cursor === undefined) {
    return undefined;
  }
  const decoded = Buffer.from(cursor, "base64").toString("utf-8");
  const parsed = JSON.parse(decoded);
  return {
    createdAt: parsed.createdAt,
    id: parsed.id,
  };
}
function encodeCursor(createdAt: string, id: string): string {
  const payload = { createdAt, id };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}
export async function patchEcommerceMallCategories(props: {
  body: IEcommerceMallCategory.IRequest;
}): Promise<IPageIEcommerceMallCategory.ISummary> {
  const limit = props.body.limit ?? 20;
  const page = props.body.page ?? 1;
  const cursor = parseCursor(props.body.cursor);
  const baseWhere: Prisma.ecommerce_mall_categoriesWhereInput = {
    deleted_at: null,
    ...(props.body.parentId !== undefined && {
      parent_id: props.body.parentId,
    }),
    ...(props.body.search !== undefined &&
      props.body.search.length > 0 && {
        name: {
          contains: props.body.search,
          mode: "insensitive" as const,
        },
      }),
  };
  let whereInput: Prisma.ecommerce_mall_categoriesWhereInput = baseWhere;
  if (cursor !== undefined) {
    whereInput = {
      ...baseWhere,
      OR: [
        { created_at: { lt: cursor.createdAt } },
        {
          AND: [
            { created_at: { equals: cursor.createdAt } },
            { id: { lt: cursor.id } },
          ],
        },
      ],
    };
  }
  const skipValue = cursor !== undefined ? undefined : (page - 1) * limit;
  const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
    ...EcommerceMallCategoryAtSummaryTransformer.select(),
    where: whereInput,
    skip: skipValue,
    take: limit + 1,
    orderBy: [
      { parent_id: { sort: "asc", nulls: "first" } },
      { created_at: "desc" },
      { id: "desc" },
    ],
  });
  const total = await MyGlobal.prisma.ecommerce_mall_categories.count({
    where: baseWhere,
  });
  const hasMore = records.length > limit;
  const paginationRecords = hasMore ? records.slice(0, limit) : records;
  const currentPage = cursor !== undefined ? 1 : page;
  const nextCursor =
    hasMore && paginationRecords.length > 0
      ? encodeCursor(
          paginationRecords[
            paginationRecords.length - 1
          ].created_at.toISOString(),
          paginationRecords[paginationRecords.length - 1].id,
        )
      : null;
  return {
    pagination: {
      current: currentPage,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit) || 1,
    } satisfies IPage.IPagination,
    data: await EcommerceMallCategoryAtSummaryTransformer.transformAll(
      paginationRecords,
    ),
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
// import { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
// import { IPageIEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCategory";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCategories(props: {
//   body: IEcommerceMallCategory.IRequest;
// }): Promise<IPageIEcommerceMallCategory.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_categories.findMany({
//     ...EcommerceMallCategoryAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await EcommerceMallCategoryAtSummaryTransformer.transformAll(records),
//   };
// }
// ```
//--------------------------------------------------------------