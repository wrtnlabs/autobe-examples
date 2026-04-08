import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
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
import { EcommerceMallAdminRequestOfCustomerTransformer } from "../transformers/EcommerceMallAdminRequestOfCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallSuperAdminAdminRequestsRequestIdApprove(props: {
  superAdmin: SuperadminPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IEcommerceMallAdminRequestOfCustomer> {
  // 1. Query the pending admin request
  const record =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
      ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
      where: {
        id: props.requestId,
        status: "pending",
        deleted_at: null,
      },
    });
  // 2. Get the requesting actor's ID to check self-approval
  const requestingActorId = await getRequestingActorId(record);
  // 3. Prevent self-approval: the super admin cannot approve their own request
  if (requestingActorId === props.superAdmin.id) {
    throw new HttpException(
      "Cannot approve your own administrator request",
      403,
    );
  }
  // 4. Grant admin privileges based on requested grade
  await grantAdminPrivileges(record, requestingActorId);
  // 5. Update the request status to approved
  const updated = await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: "approved",
      reviewed_by_id: props.superAdmin.id,
      updated_at: new Date(),
    },
    ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
  });
  // 6. Return transformed response
  return await EcommerceMallAdminRequestOfCustomerTransformer.transform(
    updated,
  );
}
function toUuid(value: string): value is string & tags.Format<"uuid"> {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
async function getRequestingActorId(
  record: EcommerceMallAdminRequestOfCustomerTransformer.Payload,
): Promise<string & tags.Format<"uuid">> {
  if (record.actor_type === "customer") {
    const customerLink =
      await MyGlobal.prisma.ecommerce_mall_admin_request_of_customers.findFirst(
        {
          where: { ecommerce_mall_admin_request_id: record.id },
          select: { ecommerce_mall_customer_id: true },
        },
      );
    if (!customerLink) {
      throw new HttpException("Customer request link not found", 500);
    }
    if (!toUuid(customerLink.ecommerce_mall_customer_id)) {
      throw new HttpException("Invalid customer ID format", 500);
    }
    return customerLink.ecommerce_mall_customer_id;
  } else if (record.actor_type === "seller") {
    const sellerLink =
      await MyGlobal.prisma.ecommerce_mall_admin_request_of_sellers.findFirst({
        where: { ecommerce_mall_admin_request_id: record.id },
        select: { ecommerce_mall_seller_id: true },
      });
    if (!sellerLink) {
      throw new HttpException("Seller request link not found", 500);
    }
    if (!toUuid(sellerLink.ecommerce_mall_seller_id)) {
      throw new HttpException("Invalid seller ID format", 500);
    }
    return sellerLink.ecommerce_mall_seller_id;
  }
  throw new HttpException("Invalid actor type", 500);
}
async function grantAdminPrivileges(
  record: EcommerceMallAdminRequestOfCustomerTransformer.Payload,
  requestingActorId: string & tags.Format<"uuid">,
): Promise<void> {
  const currentTime = new Date();
  if (record.requested_grade === "super_admin") {
    // Check if user is already a super admin
    const existingSuperAdmin =
      await MyGlobal.prisma.ecommerce_mall_super_admins.findFirst({
        where: { id: requestingActorId, deleted_at: null },
      });
    if (!existingSuperAdmin) {
      // Get the actor's email and password hash from seller or customer
      const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
        where: { id: requestingActorId },
        select: { email: true, password_hash: true },
      });
      const customer = !seller
        ? await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
            where: { id: requestingActorId },
            select: { email: true, password_hash: true },
          })
        : null;
      const actor = seller ?? customer;
      if (!actor) {
        throw new HttpException("Actor not found for admin promotion", 500);
      }
      await MyGlobal.prisma.ecommerce_mall_super_admins.create({
        data: {
          id: requestingActorId,
          email: actor.email,
          password_hash: actor.password_hash,
          created_at: currentTime,
          updated_at: currentTime,
          deleted_at: null,
        },
      });
    }
  } else if (record.requested_grade === "admin") {
    // Check if user is already an admin
    const existingAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findFirst(
      {
        where: { id: requestingActorId, deleted_at: null },
      },
    );
    if (!existingAdmin) {
      // Get the actor's email and password hash
      const seller = await MyGlobal.prisma.ecommerce_mall_sellers.findFirst({
        where: { id: requestingActorId },
        select: { email: true, password_hash: true },
      });
      const customer = !seller
        ? await MyGlobal.prisma.ecommerce_mall_customers.findFirst({
            where: { id: requestingActorId },
            select: { email: true, password_hash: true },
          })
        : null;
      const actor = seller ?? customer;
      if (!actor) {
        throw new HttpException("Actor not found for admin promotion", 500);
      }
      await MyGlobal.prisma.ecommerce_mall_admins.create({
        data: {
          id: requestingActorId,
          email: actor.email,
          password_hash: actor.password_hash,
          name: actor.email,
          created_at: currentTime,
          updated_at: currentTime,
          deleted_at: null,
        },
      });
    }
  } else {
    throw new HttpException("Invalid requested grade", 400);
  }
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
// import { IEcommerceMallAdminRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestOfCustomer";
// import { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postEcommerceMallSuperAdminAdminRequestsRequestIdApprove(props: {
//   superAdmin: SuperadminPayload;
//   requestId: string & tags.Format<"uuid">;
// }): Promise<IEcommerceMallAdminRequestOfCustomer> {
//   const record = await MyGlobal.prisma.ecommerce_mall_admin_requests.findFirstOrThrow({
//     ...EcommerceMallAdminRequestOfCustomerTransformer.select(),
//     where: { ... },
//   });
//   return await EcommerceMallAdminRequestOfCustomerTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------