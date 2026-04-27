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
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ECommerceMallCustomerAddressAtSummaryTransformer } from "../transformers/ECommerceMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchECommerceMallAdministratorCustomersCustomerIdAddresses(props: {
  administrator: AdministratorPayload;
  customerId: string & tags.Format<"uuid">;
  body: IECommerceMallCustomerAddress.IRequest;
}): Promise<IPageIECommerceMallCustomerAddress.ISummary> {
  // Verify customer exists — throws 404 if not found
  await MyGlobal.prisma.e_commerce_mall_customers.findUniqueOrThrow({
    where: { id: props.customerId },
    select: { id: true },
  });
  // Pagination defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Build WHERE clause
  const whereInput = {
    e_commerce_mall_customer_id: props.customerId,
    deleted_at: null,
    ...(props.body.search
      ? {
          OR: [
            {
              recipient_name: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              street_address: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            { city: { contains: props.body.search, mode: "insensitive" } },
            {
              state_province: {
                contains: props.body.search,
                mode: "insensitive",
              },
            },
            {
              postal_code: { contains: props.body.search, mode: "insensitive" },
            },
            { country: { contains: props.body.search, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(props.body.isDefault !== undefined
      ? { is_default: props.body.isDefault }
      : {}),
  } satisfies Prisma.e_commerce_mall_customer_addressesWhereInput;
  // Get total count for pagination
  const total = await MyGlobal.prisma.e_commerce_mall_customer_addresses.count({
    where: whereInput,
  });
  // Fetch records with transformer select
  const records =
    await MyGlobal.prisma.e_commerce_mall_customer_addresses.findMany({
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
      ...ECommerceMallCustomerAddressAtSummaryTransformer.select(),
    });
  // Calculate total pages (0 when no records)
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: pages,
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ECommerceMallCustomerAddressAtSummaryTransformer.transform,
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
// import { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
// import { IPageIECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallCustomerAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchECommerceMallAdministratorCustomersCustomerIdAddresses(props: {
//   administrator: AdministratorPayload;
//   customerId: string & tags.Format<"uuid">;
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