import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallSellerTransformer } from "../transformers/EcommerceMallSellerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminSellersSellerIdApprove(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallSeller> {
  // Step 1: Find seller by sellerId
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow(
    {
      where: { id: props.sellerId },
      select: {
        id: true,
        email: true,
        approval_status: true,
      },
    },
  );
  // Step 2: Verify seller is in pending status
  if (seller.approval_status !== "pending") {
    throw new HttpException("Seller is not in pending status", 400);
  }
  // Step 3: Verify admin is not approving their own seller account
  // Find admin email to compare
  const adminRecord =
    await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
      where: { id: props.admin.id },
      select: { email: true },
    });
  if (seller.email === adminRecord.email) {
    throw new HttpException("Cannot approve your own seller account", 403);
  }
  // Step 4: Update seller approval_status to 'approved'
  const now = new Date();
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "approved",
      rejection_reason: null,
      rejected_at: null,
      updated_at: now,
    },
  });
  // Step 5: Create seller_approval record with status='approved'
  await MyGlobal.prisma.ecommerce_mall_seller_approvals.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: props.sellerId,
      reviewed_by_admin_id: props.admin.id,
      status: "approved",
      created_at: now,
      updated_at: now,
    },
  });
  // Step 6: Return updated seller with full transformer
  const updatedSeller =
    await MyGlobal.prisma.ecommerce_mall_sellers.findUniqueOrThrow({
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    });
  return await EcommerceMallSellerTransformer.transform(updatedSeller);
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
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
// import { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
// import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
// import { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallAdminAdminSellersSellerIdApprove(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallSeller> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------