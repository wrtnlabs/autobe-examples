import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommercePlatformShippingAddressAtSummaryTransformer } from "../transformers/EcommercePlatformShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommercePlatformCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommercePlatformShippingAddress.IRequest;
}): Promise<IPageIEcommercePlatformShippingAddress.ISummary> {
  // Get customer's profile
  const customerProfile =
    await MyGlobal.prisma.ecommerce_platform_customer_profiles.findUniqueOrThrow(
      {
        where: { ecommerce_platform_customer_id: props.customer.id },
      },
    );
  // Build where clause with filters
  const whereInput: Prisma.ecommerce_platform_shipping_addressesWhereInput = {
    ecommerce_platform_customer_profile_id: customerProfile.id,
    deleted_at: null,
    ...(props.body.recipient_name !== undefined && {
      recipient_name: props.body.recipient_name,
    }),
    ...(props.body.phone_number !== undefined && {
      phone_number: props.body.phone_number,
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...((props.body.minCreatedAt !== undefined ||
      props.body.maxCreatedAt !== undefined) && {
      created_at: {
        ...(props.body.minCreatedAt !== undefined && {
          gte: props.body.minCreatedAt,
        }),
        ...(props.body.maxCreatedAt !== undefined && {
          lte: props.body.maxCreatedAt,
        }),
      } satisfies Prisma.DateTimeFilter,
    }),
  };
  // Pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Sorting
  const orderByInput: Prisma.ecommerce_platform_shipping_addressesOrderByWithRelationInput =
    props.body.sort !== undefined
      ? { created_at: props.body.sort.includes("asc") ? "asc" : "desc" }
      : { created_at: "desc" };
  // Fetch records and count
  const records =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...EcommercePlatformShippingAddressAtSummaryTransformer.select(),
    });
  const total =
    await MyGlobal.prisma.ecommerce_platform_shipping_addresses.count({
      where: whereInput,
    });
  // Transform and return paginated response
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: total === 0 ? 0 : Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommercePlatformShippingAddressAtSummaryTransformer.transform,
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
// import { IEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShippingAddress";
// import { IPageIEcommercePlatformShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformShippingAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommercePlatformCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommercePlatformShippingAddress.IRequest;
// }): Promise<IPageIEcommercePlatformShippingAddress.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_platform_shipping_addresses.findMany({
//     ...EcommercePlatformShippingAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommercePlatformShippingAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------