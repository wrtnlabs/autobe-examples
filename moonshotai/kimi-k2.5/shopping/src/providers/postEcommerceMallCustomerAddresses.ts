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

export async function postEcommerceMallCustomerAddresses(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomer.ICreate;
}): Promise<IEcommerceMallCustomer> {
  // Check if this is the customer's first address
  const existingCount = await MyGlobal.prisma.ecommerce_mall_addresses.count({
    where: {
      ecommerce_mall_customer_id: props.customer.id,
    },
  });
  const isFirstAddress = existingCount === 0;
  const now = new Date().toISOString();
  const created = await MyGlobal.prisma.ecommerce_mall_addresses.create({
    data: {
      id: v4(),
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state_or_province: props.body.state,
      postal_code: props.body.postalCode,
      country: props.body.country,
      is_default: isFirstAddress,
      ecommerce_mall_customer_id: props.customer.id,
      created_at: now,
      updated_at: now,
    },
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
    },
  });
  return {
    id: created.id,
    recipientName: created.recipient_name,
    phoneNumber: created.phone_number,
    streetAddress: created.street_address,
    city: created.city,
    state: created.state_or_province,
    postalCode: created.postal_code,
    country: created.country,
    isDefault: created.is_default,
    createdAt: toISOStringSafe(created.created_at),
    updatedAt: toISOStringSafe(created.updated_at),
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
// export async function postEcommerceMallCustomerAddresses(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomer.ICreate;
// }): Promise<IEcommerceMallCustomer> {
//   // No matching Collector/Transformer found for this operation.
//     // You MUST call getDatabaseSchemas first to get exact relation property names.
//     // NEVER guess relation names from table names — always verify against the schema.
//     ...
// }
// ```
//--------------------------------------------------------------