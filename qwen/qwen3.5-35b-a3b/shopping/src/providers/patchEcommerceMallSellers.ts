import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallSellerAtSummaryTransformer } from "../transformers/EcommerceMallSellerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallSellers(props: {
  body: IEcommerceMallSeller.IRequest;
}): Promise<IPageIEcommerceMallSeller.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const sort = props.body.sort ?? "created_at";
  const orderBy =
    sort === "created_at"
      ? { created_at: "desc" as const }
      : sort === "display_name"
        ? { display_name: "asc" as const }
        : sort === "approval_status"
          ? { approval_status: "asc" as const }
          : { created_at: "desc" as const };
  const whereInput: Prisma.ecommerce_mall_sellersWhereInput = {
    deleted_at: props.body.include_deleted ? undefined : null,
    ...(props.body.approval_status !== undefined && {
      approval_status: props.body.approval_status,
    }),
    ...(props.body.is_suspended !== undefined && {
      is_suspended: props.body.is_suspended,
    }),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? {
          OR: [
            {
              display_name: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
            {
              email: {
                contains: props.body.search,
                mode: "insensitive" as const,
              },
            },
          ],
        }
      : {}),
    ...(props.body.created_at_min !== undefined && {
      created_at: {
        gte: props.body.created_at_min,
      },
    }),
    ...(props.body.created_at_max !== undefined && {
      created_at: {
        lte: props.body.created_at_max,
      },
    }),
  };
  const [records, total] = await Promise.all([
    MyGlobal.prisma.ecommerce_mall_sellers.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy,
      ...EcommerceMallSellerAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.ecommerce_mall_sellers.count({
      where: whereInput,
    }),
  ]);
  const data = await ArrayUtil.asyncMap(
    records,
    EcommerceMallSellerAtSummaryTransformer.transform,
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IPageIEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSeller";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallSellers(props: {
//   body: IEcommerceMallSeller.IRequest;
// }): Promise<IPageIEcommerceMallSeller.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_sellers.findMany({
//     ...EcommerceMallSellerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallSellerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------