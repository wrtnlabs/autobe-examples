import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommercePlatformCustomerAtSummaryTransformer } from "../transformers/EcommercePlatformCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomers(props: {
  body: IEcommercePlatformCustomer.IRequest;
}): Promise<IPageIEcommercePlatformCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    ...(props.body.email !== undefined &&
      props.body.email.length > 0 && {
        email: {
          contains: props.body.email,
          mode: "insensitive",
        },
      }),
    ...(props.body.displayName !== undefined &&
      props.body.displayName.length > 0 && {
        customerProfile: {
          display_name: {
            contains: props.body.displayName,
            mode: "insensitive",
          },
        },
      }),
    ...(props.body.isBanned !== undefined && {
      is_banned: props.body.isBanned,
    }),
    ...(props.body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(props.body.createdAtFrom) },
    }),
    ...(props.body.createdAtTo !== undefined && {
      created_at: { lte: new Date(props.body.createdAtTo) },
    }),
  } satisfies Prisma.ecommerce_platform_customersWhereInput;
  const parseSort = (
    sortStr: string | undefined,
  ): Prisma.ecommerce_platform_customersOrderByWithRelationInput => {
    const parts = sortStr ?? "createdAt.desc";
    const field = parts.split(".")[0] ?? "createdAt";
    const direction = parts.split(".")[1] === "asc" ? "asc" : "desc";
    switch (field) {
      case "id":
        return { id: direction };
      case "email":
        return { email: direction };
      case "isBanned":
        return { is_banned: direction };
      default:
        return { created_at: direction };
    }
  };
  const records = await MyGlobal.prisma.ecommerce_platform_customers.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: parseSort(props.body.sort),
    ...EcommercePlatformCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.ecommerce_platform_customers.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformCustomerAtSummaryTransformer.transform,
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
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// import { IPageIEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomers(props: {
//   body: IEcommercePlatformCustomer.IRequest;
// }): Promise<IPageIEcommercePlatformCustomer.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_customers.findMany({
//     ...EcommercePlatformCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------