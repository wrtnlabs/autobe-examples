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

export async function postEcommerceMallAdminAdminSellersSellerIdReject(props: {
  admin: AdminPayload;
  sellerId: string & tags.Format<"uuid">;
  body: IEcommerceMallSeller.IUpdate;
}): Promise<IEcommerceMallSeller> {
  // 1. Find the seller by sellerId (must exist and not be soft-deleted)
  const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
    where: { id: props.sellerId, deleted_at: null },
  });
  // 2. Verify the seller status is 'pending'
  if (seller.approval_status !== "pending") {
    throw new HttpException(
      `Cannot reject seller with status '${seller.approval_status}'. Only pending sellers can be rejected.`,
      400,
    );
  }
  // 3. Update the seller record with rejection details
  const now = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_sellers.update({
    where: { id: props.sellerId },
    data: {
      approval_status: "rejected",
      rejection_reason: props.body.rejectionReason,
      rejected_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 4. Create a seller_approval record to track the review history
  await MyGlobal.prisma.ecommerce_mall_seller_approvals.create({
    data: {
      id: v4(),
      ecommerce_mall_seller_id: props.sellerId,
      reviewed_by_admin_id: props.admin.id,
      status: "rejected",
      rejection_reason: props.body.rejectionReason,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
  // 5. Fetch the updated seller with all relations for response
  const updated = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow(
    {
      where: { id: props.sellerId },
      ...EcommerceMallSellerTransformer.select(),
    },
  );
  // 6. Transform and return the response
  return await EcommerceMallSellerTransformer.transform(updated);
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
// export async function postEcommerceMallAdminAdminSellersSellerIdReject(props: {
//   admin: AdminPayload;
//   sellerId: string & tags.Format<"uuid">;
//   body: IEcommerceMallSeller.IUpdate;
// }): Promise<IEcommerceMallSeller> {
//   const record = await MyGlobal.prisma.ecommerce_mall_sellers.findFirstOrThrow({
//     ...EcommerceMallSellerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallSellerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------