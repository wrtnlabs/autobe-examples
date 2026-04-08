import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorPromotionRequestTransformer } from "../transformers/ShoppingMallAdministratorPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorPromotionRequestsRequestId(props: {
  administrator: AdministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorPromotionRequest.IUpdate;
}): Promise<IShoppingMallAdministratorPromotionRequest> {
  // Validate that the requesting administrator is a super administrator
  const admin =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true },
    });
  if (admin.grade !== "super") {
    throw new HttpException(
      "Only super administrators can process promotion requests",
      403,
    );
  }
  // Find the promotion request
  const request =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        select: {
          id: true,
          status: true,
          actor_type: true,
          reason: true,
        },
      },
    );
  // Verify the request status is 'pending'
  if (request.status !== "pending") {
    throw new HttpException("Request is not pending", 400);
  }
  // Validate rejected_reason if status is 'rejected'
  if (
    props.body.status === "rejected" &&
    (!props.body.rejected_reason || props.body.rejected_reason.trim() === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a request",
      400,
    );
  }
  // Look up the user ID from subtype tables for snapshot
  let userId: string;
  if (request.actor_type === "customer") {
    const customerRequest =
      await MyGlobal.prisma.shopping_mall_administrator_promotion_request_of_customers.findUniqueOrThrow(
        {
          where: {
            shopping_mall_administrator_promotion_request_id: props.requestId,
          },
          select: { shopping_mall_customer_id: true },
        },
      );
    userId = customerRequest.shopping_mall_customer_id;
  } else {
    const sellerRequest =
      await MyGlobal.prisma.shopping_mall_administrator_promotion_request_of_sellers.findUniqueOrThrow(
        {
          where: {
            shopping_mall_administrator_promotion_requests_id: props.requestId,
          },
          select: { seller_id: true },
        },
      );
    userId = sellerRequest.seller_id;
  }
  // Create a snapshot of the current state before updating
  await MyGlobal.prisma.shopping_mall_administrator_promotion_request_snapshots.create(
    {
      data: {
        id: v4(),
        shopping_mall_administrator_promotion_request_id: props.requestId,
        user_id: userId,
        user_type: request.actor_type,
        reason: request.reason,
        status: request.status,
        approved_by: null,
        response_reason: null,
        created_at: new Date(),
      },
    },
  );
  // Update the promotion request
  await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      processed_by_administrator_id: props.administrator.id,
      rejected_reason:
        props.body.status === "rejected" ? props.body.rejected_reason : null,
      updated_at: new Date(),
    },
  });
  // If approved, create a new administrator account for the user
  if (props.body.status === "approved") {
    let userEmail: string;
    if (request.actor_type === "customer") {
      const customerRequest =
        await MyGlobal.prisma.shopping_mall_administrator_promotion_request_of_customers.findUniqueOrThrow(
          {
            where: {
              shopping_mall_administrator_promotion_request_id: props.requestId,
            },
            select: { customer: { select: { email: true } } },
          },
        );
      userEmail = customerRequest.customer.email;
    } else {
      const sellerRequest =
        await MyGlobal.prisma.shopping_mall_administrator_promotion_request_of_sellers.findUniqueOrThrow(
          {
            where: {
              shopping_mall_administrator_promotion_requests_id:
                props.requestId,
            },
            select: { seller: { select: { email: true } } },
          },
        );
      userEmail = sellerRequest.seller.email;
    }
    // Create new administrator account for the user
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: v4(),
        email: userEmail,
        password_hash: await PasswordUtil.hash(v4()),
        grade: "regular",
        banned: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  // Return the updated promotion request
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallAdministratorPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorPromotionRequestTransformer.transform(
    updated,
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
// import { IShoppingMallAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorPromotionRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallAdministratorPromotionRequestsRequestId(props: {
//   administrator: AdministratorPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdministratorPromotionRequest.IUpdate;
// }): Promise<IShoppingMallAdministratorPromotionRequest> {
//   await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_administrator_promotion_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallAdministratorPromotionRequestTransformer.select(),
//   });
//   return await ShoppingMallAdministratorPromotionRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------