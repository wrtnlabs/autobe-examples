import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerAddressAtSummaryTransformer } from "../transformers/ShoppingMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchShoppingMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomerAddress.IRequest;
}): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.shopping_mall_customer_addressesWhereInput = {
    shopping_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.search !== undefined && {
      recipient_name: {
        contains: props.body.search,
        mode: "insensitive",
      },
    }),
    ...(props.body.isDefault !== undefined && {
      is_default: props.body.isDefault,
    }),
    ...(props.body.country !== undefined && {
      country: props.body.country,
    }),
  };
  const orderByInput: Prisma.shopping_mall_customer_addressesOrderByWithRelationInput =
    (
      props.body.sortBy === "is_default"
        ? { is_default: props.body.sortOrder === "asc" ? "asc" : "desc" }
        : props.body.sortBy === "updated_at"
          ? { updated_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
          : { created_at: props.body.sortOrder === "asc" ? "asc" : "desc" }
    ) satisfies Prisma.shopping_mall_customer_addressesOrderByWithRelationInput;
  const records =
    await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: orderByInput,
      ...ShoppingMallCustomerAddressAtSummaryTransformer.select(),
    });
  const total = await MyGlobal.prisma.shopping_mall_customer_addresses.count({
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
      ShoppingMallCustomerAddressAtSummaryTransformer.transform,
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
// import { IShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAddress";
// import { IPageIShoppingMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchShoppingMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IShoppingMallCustomerAddress.IRequest;
// }): Promise<IPageIShoppingMallCustomerAddress.ISummary> {
//   const records = await MyGlobal.prisma.shopping_mall_customer_addresses.findMany({
//     ...ShoppingMallCustomerAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ShoppingMallCustomerAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------