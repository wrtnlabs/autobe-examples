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

export async function putEcommerceMallCustomerAddressesAddressId(props: {
  customer: CustomerPayload;
  addressId: string;
  body: IEcommerceMallCustomer.IUpdate;
}): Promise<IEcommerceMallCustomer> {
  // Verify ownership - use findFirst to combine existence and ownership check
  // Returns null if address doesn't exist OR doesn't belong to this customer
  const existing = await MyGlobal.prisma.ecommerce_mall_addresses.findFirst({
    where: {
      id: props.addressId,
      ecommerce_mall_customer_id: props.customer.id,
      deleted_at: null,
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
  if (existing === null) {
    throw new HttpException("Address not found", 404);
  }
  // Update the address with new values from request body
  // Note: IEcommerceMallCustomer.IUpdate should contain all updateable fields
  const updated = await MyGlobal.prisma.ecommerce_mall_addresses.update({
    where: { id: props.addressId },
    data: {
      recipient_name: props.body.recipientName,
      phone_number: props.body.phoneNumber,
      street_address: props.body.streetAddress,
      city: props.body.city,
      state_or_province: props.body.state,
      postal_code: props.body.postalCode,
      country: props.body.country,
      updated_at: new Date(),
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
    id: updated.id,
    recipientName: updated.recipient_name,
    phoneNumber: updated.phone_number,
    streetAddress: updated.street_address,
    city: updated.city,
    state: updated.state_or_province,
    postalCode: updated.postal_code,
    country: updated.country,
    isDefault: updated.is_default,
    createdAt: updated.created_at.toISOString(),
    updatedAt: updated.updated_at.toISOString(),
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
// export async function putEcommerceMallCustomerAddressesAddressId(props: {
//   customer: CustomerPayload;
//   addressId: string;
//   body: IEcommerceMallCustomer.IUpdate;
// }): Promise<IEcommerceMallCustomer> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------