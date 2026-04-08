import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdministratorPayload } from "../decorators/payload/AdministratorPayload";
import { ShoppingMallAdministratorRequestTransformer } from "../transformers/ShoppingMallAdministratorRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallAdministratorAdministratorRequestsAdministratorRequestId(props: {
  administrator: AdministratorPayload;
  administratorRequestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdministratorRequest.IUpdate;
}): Promise<IShoppingMallAdministratorRequest> {
  const administrator =
    await MyGlobal.prisma.shopping_mall_administrators.findUniqueOrThrow({
      where: { id: props.administrator.id },
      select: { id: true, grade: true, banned: true, deleted_at: true },
    });
  if (administrator.grade !== "super") {
    throw new HttpException(
      "Only super administrators can approve or reject administrator requests",
      403,
    );
  }
  const request =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorRequestId },
        select: {
          id: true,
          status: true,
          actor_type: true,
          customerLink: {
            select: { customer_id: true },
          } satisfies Prisma.shopping_mall_administrator_request_of_customersFindManyArgs,
          sellerRequest: {
            select: { shopping_mall_seller_id: true },
          } satisfies Prisma.shopping_mall_administrator_request_of_sellersFindManyArgs,
        },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Only pending requests can be updated", 400);
  }
  if (
    props.body.status === "rejected" &&
    (!props.body.rejection_reason || props.body.rejection_reason.trim() === "")
  ) {
    throw new HttpException(
      "Rejection reason is required when rejecting a request",
      400,
    );
  }
  const rejection_reason =
    props.body.status === "approved" ? null : props.body.rejection_reason;
  await MyGlobal.prisma.shopping_mall_administrator_requests.update({
    where: { id: props.administratorRequestId },
    data: {
      status: props.body.status,
      rejection_reason: rejection_reason,
      processed_by_administrator_id: props.administrator.id,
      updated_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    let email: string | null = null;
    if (request.actor_type === "customer") {
      if (!request.customerLink) {
        throw new HttpException("Customer link not found for request", 500);
      }
      const customer = await MyGlobal.prisma.shopping_mall_customers.findUnique(
        {
          where: { id: request.customerLink.customer_id },
          select: { email: true },
        },
      );
      if (!customer) {
        throw new HttpException("Requestor customer account not found", 404);
      }
      email = customer.email;
    } else if (request.actor_type === "seller") {
      if (!request.sellerRequest) {
        throw new HttpException("Seller link not found for request", 500);
      }
      const seller = await MyGlobal.prisma.shopping_mall_sellers.findUnique({
        where: { id: request.sellerRequest.shopping_mall_seller_id },
        select: { email: true },
      });
      if (!seller) {
        throw new HttpException("Requestor seller account not found", 404);
      }
      email = seller.email;
    }
    if (!email) {
      throw new HttpException("Requestor account not found", 404);
    }
    const password_hash = await PasswordUtil.hash(v4());
    await MyGlobal.prisma.shopping_mall_administrators.create({
      data: {
        id: v4(),
        email: email,
        password_hash: password_hash,
        grade: "regular",
        banned: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow(
      {
        where: { id: props.administratorRequestId },
        ...ShoppingMallAdministratorRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdministratorRequestTransformer.transform(updated);
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
// import { IShoppingMallAdministratorRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorRequest";
// import { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putShoppingMallAdministratorAdministratorRequestsAdministratorRequestId(props: {
//   administrator: AdministratorPayload;
//   administratorRequestId: string & tags.Format<"uuid">;
//   body: IShoppingMallAdministratorRequest.IUpdate;
// }): Promise<IShoppingMallAdministratorRequest> {
//   await MyGlobal.prisma.shopping_mall_administrator_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.shopping_mall_administrator_requests.findUniqueOrThrow({
//     where: { ... },
//     ...ShoppingMallAdministratorRequestTransformer.select(),
//   });
//   return await ShoppingMallAdministratorRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------