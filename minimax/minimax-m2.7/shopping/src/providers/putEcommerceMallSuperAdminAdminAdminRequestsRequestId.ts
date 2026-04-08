import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallSuperAdminAdminAdminRequestsRequestId(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequest.IUpdate;
}): Promise<IEcommerceMallAdminRequest> {
  // 1. Fetch the admin request with actor details
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      select: {
        id: true,
        status: true,
        actor_type: true,
        requested_grade: true,
        customer: {
          select: {
            customer: {
              select: { id: true, email: true },
            },
          },
        },
        adminRequestOfSeller: {
          select: {
            seller: {
              select: { id: true, email: true },
            },
          },
        },
      },
    });
  // 2. Validate request is pending
  if (request.status !== "pending") {
    throw new HttpException(
      `Admin request is not pending. Current status: ${request.status}`,
      400,
    );
  }
  // 3. Validate reviewed_reason is required when rejecting
  if (props.body.action === "reject") {
    if (
      props.body.reviewed_reason === undefined ||
      props.body.reviewed_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Reviewed reason is required when rejecting an admin request",
        400,
      );
    }
  }
  // 4. Update the admin request
  const updatedAt = toISOStringSafe(new Date());
  await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.action === "approve" ? "approved" : "rejected",
      reviewed_by_id: props.superAdmin.id,
      reviewed_reason:
        props.body.action === "reject" ? props.body.reviewed_reason : null,
      updated_at: new Date(),
    },
  });
  // 5. If approving, create admin record for the requesting user
  if (props.body.action === "approve") {
    let adminEmail: string;
    let adminName: string = "Admin";
    if (request.actor_type === "customer" && request.customer) {
      adminEmail = request.customer.customer.email;
      // Get customer profile for display name
      const profile =
        await MyGlobal.prisma.ecommerce_mall_customer_profiles.findFirst({
          where: { ecommerce_mall_customer_id: request.customer.customer.id },
          select: { display_name: true },
        });
      if (profile) {
        adminName = profile.display_name;
      }
      // Check if already an admin
      const existingAdmin =
        await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
          where: { email: adminEmail },
        });
      if (!existingAdmin) {
        const passwordHash = await PasswordUtil.hash("ChangeMe123!");
        await MyGlobal.prisma.ecommerce_mall_admins.create({
          data: {
            id: v4(),
            email: adminEmail,
            password_hash: passwordHash,
            name: adminName,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    } else if (
      request.actor_type === "seller" &&
      request.adminRequestOfSeller
    ) {
      adminEmail = request.adminRequestOfSeller.seller.email;
      // Get seller profile for shop name
      const profile =
        await MyGlobal.prisma.ecommerce_mall_seller_profiles.findFirst({
          where: { seller_id: request.adminRequestOfSeller.seller.id },
          select: { name: true },
        });
      if (profile?.name) {
        adminName = profile.name;
      }
      // Check if already an admin
      const existingAdmin =
        await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
          where: { email: adminEmail },
        });
      if (!existingAdmin) {
        const passwordHash = await PasswordUtil.hash("ChangeMe123!");
        await MyGlobal.prisma.ecommerce_mall_admins.create({
          data: {
            id: v4(),
            email: adminEmail,
            password_hash: passwordHash,
            name: adminName,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
  }
  // 6. Fetch and return the updated request using Transformer
  const updated =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  return await EcommerceMallAdminRequestTransformer.transform(updated);
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
// import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
// import { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
// import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putEcommerceMallSuperAdminAdminAdminRequestsRequestId(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string & tags.Format<"uuid">;
//   body: IEcommerceMallAdminRequest.IUpdate;
// }): Promise<IEcommerceMallAdminRequest> {
//   await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
//     where: { ... },
//     ...EcommerceMallAdminRequestTransformer.select(),
//   });
//   return await EcommerceMallAdminRequestTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------