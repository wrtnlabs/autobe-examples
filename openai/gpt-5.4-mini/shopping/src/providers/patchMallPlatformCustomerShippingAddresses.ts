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
  const page: number = props.body.page ?? 1;
  const limit: number = props.body.limit ?? 100;
  const skip: number = (page - 1) * limit;
  const search: string | undefined = props.body.search;
  const sort: string | undefined = props.body.sort;
  const where: Prisma.mall_platform_shipping_addressesWhereInput = {
    customer_id: props.customer.id,
    deleted_at: null,
    ...(search === undefined
      ? {}
      : {
          OR: [
            { recipient_name: { contains: search, mode: "insensitive" } },
            { phone_number: { contains: search, mode: "insensitive" } },
            { street_address: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { state_province: { contains: search, mode: "insensitive" } },
            { postal_code: { contains: search, mode: "insensitive" } },
            { country: { contains: search, mode: "insensitive" } },
          ],
        }),
  };
  const orderBy: Prisma.mall_platform_shipping_addressesOrderByWithRelationInput[] =
    sort === "recipient_name_asc"
      ? [{ recipient_name: "asc" }, { created_at: "desc" }]
      : sort === "recipient_name_desc"
        ? [{ recipient_name: "desc" }, { created_at: "desc" }]
        : sort === "created_at_asc"
          ? [{ created_at: "asc" }]
          : sort === "created_at_desc"
            ? [{ created_at: "desc" }]
            : [{ is_default: "desc" }, { created_at: "desc" }];
  const records =
    await MyGlobal.prisma.mall_platform_shipping_addresses.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      ...MallPlatformShippingAddressAtSummaryTransformer.select(),
    });
  const recordsCount: number =
    await MyGlobal.prisma.mall_platform_shipping_addresses.count({
      where,
    });
  return {
    pagination: {
      current: page,
      limit,
      records: recordsCount,
      pages: limit > 0 ? Math.ceil(recordsCount / limit) : 0,
    },
    data: await ArrayUtil.asyncMap(
      records,
      MallPlatformShippingAddressAtSummaryTransformer.transform,
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