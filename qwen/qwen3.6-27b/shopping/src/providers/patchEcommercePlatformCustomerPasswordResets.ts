import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
import { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomerPasswordReset";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformCustomerPasswordResetAtSummaryTransformer } from "../transformers/EcommercePlatformCustomerPasswordResetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerPasswordResets(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformCustomerPasswordReset.IRequest;
}): Promise<IPageIEcommercePlatformCustomerPasswordReset.ISummary> {
  if (props.body.accountType === "seller") {
    return {
      pagination: {
        current: 1,
        limit: props.body.limit ?? 100,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_platform_customer_password_resetsWhereInput =
    {
      deleted_at: null,
      ...((props.body.dateFrom !== undefined ||
        props.body.dateTo !== undefined) &&
        ({
          created_at: {
            ...(props.body.dateFrom !== undefined && {
              gte: new Date(props.body.dateFrom),
            }),
            ...(props.body.dateTo !== undefined && {
              lte: new Date(props.body.dateTo),
            }),
          },
        } satisfies Prisma.ecommerce_platform_customer_password_resetsWhereInput)),
      ...(props.body.unused === true && { used_at: null }),
      ...(props.body.unused === false && { used_at: { not: null } }),
    };
  const records =
    await MyGlobal.prisma.ecommerce_platform_customer_password_resets.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommercePlatformCustomerPasswordResetAtSummaryTransformer.select(),
    } satisfies Prisma.ecommerce_platform_customer_password_resetsFindManyArgs);
  const total =
    await MyGlobal.prisma.ecommerce_platform_customer_password_resets.count({
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
      EcommercePlatformCustomerPasswordResetAtSummaryTransformer.transform,
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
// import { IEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomerPasswordReset";
// import { IPageIEcommercePlatformCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformCustomerPasswordReset";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IEcommercePlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerPasswordResets(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformCustomerPasswordReset.IRequest;
// }): Promise<IPageIEcommercePlatformCustomerPasswordReset.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_customer_password_resets.findMany({
//     ...EcommercePlatformCustomerPasswordResetAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformCustomerPasswordResetAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------