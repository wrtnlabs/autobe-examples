import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomer.IRequest;
}): Promise<IPageIEcommerceMallCustomer.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 10;
  const skip = (page - 1) * limit;
  const whereInput: Prisma.ecommerce_mall_addressesWhereInput = {
    ecommerce_mall_customer_id: props.customer.id,
    deleted_at: null,
    ...(props.body.city !== undefined && {
      city: { contains: props.body.city, mode: Prisma.QueryMode.insensitive },
    }),
    ...(props.body.state !== undefined && {
      state: { equals: props.body.state, mode: Prisma.QueryMode.insensitive },
    }),
    ...(props.body.isDefault !== undefined && {
      is_default: props.body.isDefault,
    }),
    ...(props.body.search !== undefined && {
      OR: [
        {
          recipient_name: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          phone: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
        {
          street: {
            contains: props.body.search,
            mode: Prisma.QueryMode.insensitive,
          },
        },
      ],
    }),
  };
  const orderByInput: Prisma.ecommerce_mall_addressesOrderByWithRelationInput =
    props.body.sort === "isDefault"
      ? { is_default: "desc" }
      : props.body.sort === "city"
        ? { city: "asc" }
        : { created_at: "desc" };
  const addresses = await MyGlobal.prisma.ecommerce_mall_addresses.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: orderByInput,
    select: {
      id: true,
      recipient_name: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      postal_code: true,
      country: true,
      is_default: true,
      created_at: true,
    },
  });
  const total = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: whereInput,
  });
  return {
    data: addresses.map((address) => ({
      id: address.id satisfies string & tags.Format<"uuid">,
      recipientName: address.recipient_name,
      phone: address.phone,
      street: address.street,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
      isDefault: address.is_default,
      createdAt: toISOStringSafe(address.created_at),
    })),
    pagination: {
      current: page satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    },
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
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IPageIEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCustomer";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchEcommerceMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomer.IRequest;
// }): Promise<IPageIEcommerceMallCustomer.ISummary> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------