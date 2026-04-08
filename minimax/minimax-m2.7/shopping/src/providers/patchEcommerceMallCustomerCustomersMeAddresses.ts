import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallShippingAddressAtSummaryTransformer } from "../transformers/EcommerceMallShippingAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerCustomersMeAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallShippingAddress.IRequest;
}): Promise<IPageIEcommerceMallShippingAddress.ISummary> {
  const page =
    props.body.page ?? (1 as number & tags.Type<"int32"> & tags.Minimum<1>);
  const limitValue = props.body.limit ?? 20;
  const limit = limitValue < 1 ? 20 : limitValue > 100 ? 100 : limitValue;
  const skip = (page - 1) * limit;
  const whereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null as null,
    ...(props.body.recipient_name !== undefined && {
      recipient_name: { contains: props.body.recipient_name },
    }),
    ...(props.body.phone !== undefined && {
      phone: props.body.phone,
    }),
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city },
    }),
    ...(props.body.state !== undefined && {
      state: props.body.state,
    }),
    ...(props.body.postal_code !== undefined && {
      postal_code: props.body.postal_code,
    }),
    ...(props.body.country !== undefined && {
      country: props.body.country,
    }),
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
  } satisfies Prisma.ecommerce_mall_shipping_addressesWhereInput;
  const records =
    await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      EcommerceMallShippingAddressAtSummaryTransformer.transform,
    ),
  } satisfies IPageIEcommerceMallShippingAddress.ISummary;
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
// import { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
// import { IPageIEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallShippingAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerCustomersMeAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallShippingAddress.IRequest;
// }): Promise<IPageIEcommerceMallShippingAddress.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_shipping_addresses.findMany({
//     ...EcommerceMallShippingAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallShippingAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------