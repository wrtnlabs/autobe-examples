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
import { ECommerceMallAdminRegistrationRequestCollector } from "../collectors/ECommerceMallAdminRegistrationRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallAdminRegistrationRequestTransformer } from "../transformers/ECommerceMallAdminRegistrationRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function postECommerceMallSellerAdminRegistrationRequests(props: {
  seller: SellerPayload;
  body: IECommerceMallAdminRegistrationRequest.ICreate;
}): Promise<IECommerceMallAdminRegistrationRequest> {
  // 1. Check for an existing pending registration request from this seller
  const existingRequest =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.findFirst(
      {
        where: {
          status: "pending",
          adminRegistrationRequestSeller: {
            seller: {
              id: props.seller.id,
            },
          },
        },
        select: {
          id: true,
        },
      },
    );
  if (existingRequest !== null) {
    throw new HttpException(
      "You already have a pending administrator registration request",
      409,
    );
  }
  // 2. Create the registration request using the Collector for atomic data creation
  //    and the Transformer for complete response mapping.
  //    The Collector handles both main table and subtype table via Prisma nested create,
  //    making the entire operation atomic within a single database transaction.
  const record =
    await MyGlobal.prisma.e_commerce_mall_admin_registration_requests.create({
      data: await ECommerceMallAdminRegistrationRequestCollector.collect({
        body: props.body,
        requester_type: "seller",
        eCommerceMallCustomers: {
          id: props.seller.id,
        },
        eCommerceMallSellers: {
          id: props.seller.id,
        },
        eCommerceMallCustomerSessions: {
          id: props.seller.session_id,
        },
        eCommerceMallSellerSessions: {
          id: props.seller.session_id,
        },
      }),
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
// export async function postECommerceMallSellerAdminRegistrationRequests(props: {
//   seller: SellerPayload;
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