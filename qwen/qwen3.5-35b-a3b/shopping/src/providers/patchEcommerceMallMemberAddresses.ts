import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerAddress";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { EcommerceMallCustomerAddressAtSummaryTransformer } from "../transformers/EcommerceMallCustomerAddressAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallMemberAddresses(props: {
  member: MemberPayload;
  body: IEcommerceMallCustomerAddress.IRequest;
}): Promise<IPageIEcommerceMallCustomerAddress.ISummary> {
  const page = props.body.page ?? 1;
  const limit = Math.min(Math.max(props.body.limit ?? 20, 1), 100);
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_customer_addressesWhereInput = {
    ecommerce_mall_member_id: props.member.id,
    deleted_at: null,
    ...(props.body.is_default !== undefined && {
      is_default: props.body.is_default,
    }),
    ...(props.body.recipient_name !== undefined && {
      recipient_name: {
        contains: props.body.recipient_name,
        mode: "insensitive" as const,
      },
    }),
    ...(props.body.city !== undefined && {
      city: {
        contains: props.body.city,
        mode: "insensitive" as const,
      },
    }),
  };
  const data = await MyGlobal.prisma.ecommerce_mall_customer_addresses.findMany(
    {
      where: whereInput,
      skip,
      take: limit,
      orderBy: { created_at: "desc" as const },
      ...EcommerceMallCustomerAddressAtSummaryTransformer.select(),
    },
  );
  const total = await MyGlobal.prisma.ecommerce_mall_customer_addresses.count({
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
      data,
      EcommerceMallCustomerAddressAtSummaryTransformer.transform,
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
// import { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
// import { IPageIEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomerAddress";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallMemberAddresses(props: {
//   member: MemberPayload;
//   body: IEcommerceMallCustomerAddress.IRequest;
// }): Promise<IPageIEcommerceMallCustomerAddress.ISummary> {
//   const records = await MyGlobal.prisma.ecommerce_mall_customer_addresses.findMany({
//     ...EcommerceMallCustomerAddressAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, EcommerceMallCustomerAddressAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------