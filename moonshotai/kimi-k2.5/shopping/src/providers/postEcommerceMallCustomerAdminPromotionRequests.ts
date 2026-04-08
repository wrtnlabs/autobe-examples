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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminPromotionRequest.ICreate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  const now = new Date();
  // Check if customer already has admin status
  const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst({
    where: {
      id: props.customer.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existingAdmin) {
    throw new HttpException("You already have administrator status", 403);
  }
  // Check for existing pending promotion request via customer subtype
  const existingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_customers.findFirst(
      {
        where: {
          customer: { id: props.customer.id },
          ecommerce_mall_admin_promotion_request: {
            status: "pending",
            deleted_at: null,
          },
        },
        select: { id: true },
      },
    );
  if (existingRequest) {
    throw new HttpException(
      "You already have a pending promotion request",
      409,
    );
  }
  // Create promotion request and customer subtype in transaction
  const requestId = v4();
  const record = await MyGlobal.prisma.$transaction(async (tx) => {
    const created = await tx.ecommerce_mall_admin_promotion_requests.create({
      data: {
        id: requestId,
        status: "pending",
        reason: props.body.reason,
        rejection_reason: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
      },
    });
    await tx.ecommerce_mall_admin_promotion_request_customers.create({
      data: {
        id: v4(),
        ecommerce_mall_admin_promotion_request_id: created.id,
        ecommerce_mall_customer_id: props.customer.id,
        created_at: now,
      },
    });
    return created;
  });
  // Fetch complete record with relations for transformation
  const completeRecord =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: record.id },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    completeRecord,
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
// export async function postEcommerceMallCustomerAdminPromotionRequests(props: {
//   customer: CustomerPayload;
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