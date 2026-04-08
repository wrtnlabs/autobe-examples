import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function getEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
}): Promise<IEcommerceMallCustomer> {
  const address =
    await MyGlobal.prisma.ecommerce_mall_addresses.findUniqueOrThrow({
      where: { id: props.addressId },
      select: {
        id: true,
        recipient_name: true,
        phone_number: true,
        street_address: true,
        city: true,
        state_or_province: true,
        postal_code: true,
        country: true,
        is_default: true,
        created_at: true,
        updated_at: true,
        ecommerce_mall_customer_id: true,
      },
    });
  if (address.ecommerce_mall_customer_id !== props.customer.id) {
    throw new HttpException("Address not found", 404);
  }
  return {
    id: address.id,
    recipientName: address.recipient_name,
    phoneNumber: address.phone_number,
    streetAddress: address.street_address,
    city: address.city,
    state: address.state_or_province,
    postalCode: address.postal_code,
    country: address.country,
    isDefault: address.is_default,
    createdAt: address.created_at.toISOString(),
    updatedAt: address.updated_at.toISOString(),
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
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getEcommerceMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string;
// }): Promise<IEcommerceMallCustomer> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------