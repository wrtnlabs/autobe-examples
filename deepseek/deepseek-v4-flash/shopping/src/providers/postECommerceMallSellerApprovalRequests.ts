import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SellerPayload } from "../decorators/payload/SellerPayload";
import { ECommerceMallSellerApprovalRequestTransformer } from "../transformers/ECommerceMallSellerApprovalRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postECommerceMallSellerApprovalRequests(props: {
  seller: SellerPayload;
}): Promise<IECommerceMallSellerApprovalRequest> {
  const seller = await MyGlobal.prisma.e_commerce_mall_sellers.findUnique({
    where: { id: props.seller.id },
    select: { id: true, approval_status: true, deleted_at: true },
  });
  if (seller === null || seller.deleted_at !== null) {
    throw new HttpException("Seller not found", 404);
  }
  if (seller.approval_status === "pending") {
    throw new HttpException(
      "You already have a pending approval request under review",
      400,
    );
  }
  if (seller.approval_status === "approved") {
    throw new HttpException("Your seller account is already approved", 400);
  }
  if (seller.approval_status !== "rejected") {
    throw new HttpException(
      "Your seller account must have rejected status to submit a new approval request",
      400,
    );
  }
  const record =
    await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.create({
      data: {
        id: v4(),
        seller: { connect: { id: props.seller.id } },
        status: "pending",
        rejection_reason: null,
        reviewed_at: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...ECommerceMallSellerApprovalRequestTransformer.select(),
    });
  return await ECommerceMallSellerApprovalRequestTransformer.transform(record);
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
// import { IECommerceMallSellerApprovalRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerApprovalRequest";
// import { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
// import { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
// import { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postECommerceMallSellerApprovalRequests(props: {
//   seller: SellerPayload;
// }): Promise<IECommerceMallSellerApprovalRequest> {
//   const record = await MyGlobal.prisma.e_commerce_mall_seller_approval_requests.findFirstOrThrow({
//     ...ECommerceMallSellerApprovalRequestTransformer.select(),
//     where: { ... },
//   });
//   return await ECommerceMallSellerApprovalRequestTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------