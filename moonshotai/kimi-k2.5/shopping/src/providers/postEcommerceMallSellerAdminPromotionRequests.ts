import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminPromotionRequestCollector } from "../collectors/EcommerceMallAdminPromotionRequestCollector";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSellerAdminPromotionRequests(props: {
  seller: SellerPayload;
  body: IEcommerceMallAdminPromotionRequest.ICreate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Check if seller already has administrator status
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      user_id: props.seller.id,
      deleted_at: null,
    },
  });
  if (existingAdmin !== null) {
    throw new HttpException("You already have administrator status", 403);
  }
  // Check if seller already has a pending promotion request
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findFirst({
      where: {
        status: "pending",
        deleted_at: null,
        sellerRequest: {
          is: {
            seller_id: props.seller.id,
          },
        },
      },
    });
  if (existingRequest !== null) {
    throw new HttpException(
      "You already have a pending promotion request",
      409,
    );
  }
  // Create promotion request and seller subtype in transaction
  const createdRecord = await MyGlobal.prisma.$transaction(async (prisma) => {
    // Create main promotion request record using collector
    const mainRecord =
      await prisma.ecommerce_mall_admin_promotion_requests.create({
        data: await EcommerceMallAdminPromotionRequestCollector.collect({
          body: props.body,
          ecommerceMallCustomers: { id: "" },
          ecommerceMallSellers: { id: props.seller.id },
          ecommerceMallCustomerSessions: { id: "" },
          ecommerceMallSellerSessions: { id: props.seller.session_id },
        }),
      });
    // Create seller subtype record
    await prisma.ecommerce_mall_admin_promotion_request_sellers.create({
      data: {
        id: v4(),
        request_id: mainRecord.id,
        seller_id: props.seller.id,
      },
    });
    // Return the complete record with all nested data for transformation
    return prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow({
      where: { id: mainRecord.id },
      ...EcommerceMallAdminPromotionRequestTransformer.select(),
    });
  });
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    createdRecord,
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
// import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSellerAdminPromotionRequests(props: {
//   seller: SellerPayload;
//   body: IEcommerceMallAdminPromotionRequest.ICreate;
// }): Promise<IEcommerceMallAdminPromotionRequest> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.create({
//     data: await EcommerceMallAdminPromotionRequestCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...EcommerceMallAdminPromotionRequestTransformer.select(),
//   });
//   return await EcommerceMallAdminPromotionRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------