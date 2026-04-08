import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { MallPlatformCustomerAtSummaryTransformer } from "../transformers/MallPlatformCustomerAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformAdministratorCustomers(props: {
  administrator: AdministratorPayload;
  body: IMallPlatformCustomer.IRequest;
}): Promise<IPageIMallPlatformCustomer.ISummary> {
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const conditions: Prisma.mall_platform_customersWhereInput[] = [
    ...(props.body.id !== undefined
      ? [
          {
            id: props.body.id,
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.email !== undefined
      ? [
          {
            email: props.body.email,
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.status !== undefined
      ? [
          {
            status: props.body.status,
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.createdAtFrom !== undefined
      ? [
          {
            created_at: { gte: props.body.createdAtFrom },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.createdAtTo !== undefined
      ? [
          {
            created_at: { lte: props.body.createdAtTo },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.updatedAtFrom !== undefined
      ? [
          {
            updated_at: { gte: props.body.updatedAtFrom },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.updatedAtTo !== undefined
      ? [
          {
            updated_at: { lte: props.body.updatedAtTo },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.deletedAtFrom !== undefined &&
    props.body.deletedAtFrom !== null
      ? [
          {
            deleted_at: { gte: props.body.deletedAtFrom },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.deletedAtTo !== undefined && props.body.deletedAtTo !== null
      ? [
          {
            deleted_at: { lte: props.body.deletedAtTo },
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
    ...(props.body.search !== undefined && props.body.search.length > 0
      ? [
          {
            OR: [
              {
                email: {
                  contains: props.body.search,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
              {
                status: {
                  contains: props.body.search,
                  mode: "insensitive" as Prisma.QueryMode,
                },
              },
            ],
          } satisfies Prisma.mall_platform_customersWhereInput,
        ]
      : []),
  ];
  const where: Prisma.mall_platform_customersWhereInput =
    conditions.length > 0 ? { AND: conditions } : {};
  const records = await MyGlobal.prisma.mall_platform_customers.findMany({
    where,
    orderBy: [{ created_at: "desc" }, { id: "desc" }],
    skip,
    take: limit,
    ...MallPlatformCustomerAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.mall_platform_customers.count({ where });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformCustomerAtSummaryTransformer.transform,
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
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// import { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformAdministratorCustomers(props: {
//   administrator: AdministratorPayload;
//   body: IMallPlatformCustomer.IRequest;
// }): Promise<IPageIMallPlatformCustomer.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_customers.findMany({
//     ...MallPlatformCustomerAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformCustomerAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------