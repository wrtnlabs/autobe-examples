import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { MallPlatformShippingAddressAtSummaryTransformer } from "../transformers/MallPlatformShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchMallPlatformCustomerShippingAddresses(props: {
  customer: CustomerPayload;
  body: IMallPlatformShippingAddress.IRequest;
}): Promise<IPageIMallPlatformShippingAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const records =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findMany({
      where: {
        customer_id: props.customer.id,
        deleted_at: null,
      },
      orderBy: {
        created_at: "desc",
      },
      skip,
      take: limit,
      ...MallPlatformShippingAddressAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.mall_platform_shipping_addresses.count({
    where: {
      customer_id: props.customer.id,
      deleted_at: null,
    },
  });
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformShippingAddressAtSummaryTransformer.transform,
    ),
  } satisfies IPageIMallPlatformShippingAddress.ISummary;
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
// import { IMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShippingAddress";
// import { IPageIMallPlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformShippingAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchMallPlatformCustomerShippingAddresses(props: {
//   customer: CustomerPayload;
//   body: IMallPlatformShippingAddress.IRequest;
// }): Promise<IPageIMallPlatformShippingAddress.ISummary> {
//   const records = await MyGlobal.prisma.mall_platform_shipping_addresses.findMany({
//     ...MallPlatformShippingAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, MallPlatformShippingAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------