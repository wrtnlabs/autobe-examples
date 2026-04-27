import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ECommerceMallAdminRegistrationRequestTransformer } from "../transformers/ECommerceMallAdminRegistrationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallCustomerAdminRegistrationRequests(props: {
  customer: CustomerPayload;
  body: IECommerceMallAdminRegistrationRequest.ICreate;
}): Promise<IECommerceMallAdminRegistrationRequest> {
  // 1. Check for existing pending registration request
  const existingPending =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findFirst(
      {
        where: {
          adminRegistrationRequestCustomer: {
            customer: { id: props.customer.id },
          },
          status: "pending",
          deleted_at: null,
        },
      },
    );
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending administrator registration request",
      409,
    );
  }
  // 2. Check if customer is already an administrator by matching email identity
  const customerRecord =
    await MyGlobal.prisma.e_commerce_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
      select: { email: true },
    });
  const existingAdmin =
    await MyGlobal.prisma.e_commerce_mall_administrators.findFirst({
      where: { email: customerRecord.email, deleted_at: null },
    });
  if (existingAdmin !== null) {
    throw new HttpException("You are already an administrator", 409);
  }
  // 3. Collect data and create with nested subtype record
  const registrationId: string & tags.Format<"uuid"> = v4() as never;
  const subtypeId: string & tags.Format<"uuid"> = v4() as never;
  const now = new Date();
  const record =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.create({
      data: {
        id: registrationId,
        requester_type: "customer",
        reason: props.body.reason satisfies string & tags.MinLength<1>,
        status: "pending",
        rejection_reason: null,
        reviewed_at: null,
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
        deleted_at: null,
        reviewer: undefined,
        adminRegistrationRequestCustomer: {
          create: {
            id: subtypeId,
            customer: { connect: { id: props.customer.id } },
            created_at: toISOStringSafe(now),
            updated_at: toISOStringSafe(now),
            deleted_at: null,
          },
        },
      } satisfies Prisma.e_commerce_mall_admin_registration_requestsCreateInput,
      ...ECommerceMallAdminRegistrationRequestTransformer.select(),
    });
  return await ECommerceMallAdminRegistrationRequestTransformer.transform(
    record,
  );
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
// import { IECommerceMallAdminRegistrationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdminRegistrationRequest";
// import { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// import { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
// import { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallCustomerAdminRegistrationRequests(props: {
//   customer: CustomerPayload;
//   body: IECommerceMallAdminRegistrationRequest.ICreate;
// }): Promise<IECommerceMallAdminRegistrationRequest> {
//   const record = await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.create({
//     data: await ECommerceMallAdminRegistrationRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ECommerceMallAdminRegistrationRequestTransformer.select(),
//   });
//   return await ECommerceMallAdminRegistrationRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------