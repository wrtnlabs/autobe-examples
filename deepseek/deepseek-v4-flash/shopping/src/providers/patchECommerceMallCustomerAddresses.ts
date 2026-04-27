import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallCustomerAddressAtSummaryTransformer } from "../transformers/ECommerceMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IECommerceMallCustomerAddress.IRequest;
}): Promise<IPageIECommerceMallCustomerAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  const where: Prisma.e_commerce_mall_customer_addressesWhereInput = {
    e_commerce_mall_customer_id: props.customer.id,
    deleted_at: null,
  };
  if (props.body.search) {
    where.OR = [
      { recipient_name: { contains: props.body.search, mode: "insensitive" } },
      { street_address: { contains: props.body.search, mode: "insensitive" } },
      { city: { contains: props.body.search, mode: "insensitive" } },
      { state_province: { contains: props.body.search, mode: "insensitive" } },
      { postal_code: { contains: props.body.search, mode: "insensitive" } },
      { country: { contains: props.body.search, mode: "insensitive" } },
    ];
  }
  if (props.body.isDefault !== undefined) {
    where.is_default = props.body.isDefault;
  }
  const [addresses, total] = await Promise.all([
    MyGlobal.prisma.e_commerce_mall_customer_addresses.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallCustomerAddressAtSummaryTransformer.select(),
    }),
    MyGlobal.prisma.e_commerce_mall_customer_addresses.count({ where }),
  ]);
  return {
    data: await ArrayUtil.asyncMap(
      addresses,
      ECommerceMallCustomerAddressAtSummaryTransformer.transform,
    ),
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
  } satisfies IPageIECommerceMallCustomerAddress.ISummary;
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
// import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
// import { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallCustomerAddress.IRequest;
// }): Promise<IPageIECommerceMallCustomerAddress.ISummary> {
//   const records = await MyGlobal.prisma.e_commerce_mall_customer_addresses.findMany({
//     ...ECommerceMallCustomerAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ECommerceMallCustomerAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------