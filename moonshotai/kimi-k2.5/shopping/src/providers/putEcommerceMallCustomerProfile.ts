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

export async function putEcommerceMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IEcommerceMallCustomer.IUpdate;
}): Promise<IEcommerceMallCustomer> {
  const customer =
    await MyGlobal.prisma.ecommerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
    });
  return {
    id: customer.id,
    recipientName: customer.recipient_name,
    phoneNumber: customer.phone_number,
    streetAddress: customer.street_address,
    city: customer.city,
    state: customer.state_or_province,
    postalCode: customer.postal_code,
    country: customer.country,
    isDefault: customer.is_default,
    createdAt: toISOStringSafe(customer.created_at),
    updatedAt: toISOStringSafe(customer.updated_at),
  } satisfies IEcommerceMallCustomer;
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
// export async function putEcommerceMallCustomerProfile(props: {
//   customer: CustomerPayload;
//   body: IEcommerceMallCustomer.IUpdate;
// }): Promise<IEcommerceMallCustomer> {
//   await MyGlobal.prisma.....update({
//     where: { ... },
//     data: { ... },
//   });
// }
// ```
//--------------------------------------------------------------