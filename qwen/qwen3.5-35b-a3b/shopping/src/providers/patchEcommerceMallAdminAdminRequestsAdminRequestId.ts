import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEcommerceMallAdminRequestRequestOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfCustomer";
import { IEcommerceMallAdminRequestRequestOfSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequestOfSeller";
import { IEcommerceMallAdminRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestSnapshot";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminAtSummaryTransformer } from "../transformers/EcommerceMallAdminAtSummaryTransformer";
import { EcommerceMallAdminRequestRequestOfCustomerTransformer } from "../transformers/EcommerceMallAdminRequestRequestOfCustomerTransformer";
import { EcommerceMallAdminRequestRequestOfSellerTransformer } from "../transformers/EcommerceMallAdminRequestRequestOfSellerTransformer";
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { EcommerceMallAdminRequestSnapshotTransformer } from "../transformers/EcommerceMallAdminRequestSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequestsAdminRequestId(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequestRequest.IUpdateStatus;
}): Promise<IEcommerceMallAdminRequestRequest> {
  // Verify admin is super administrator (not banned)
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
  });
  if (admin.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch pending admin request
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.adminRequestId },
        include: {
          snapshots: true,
          customerRequests: true,
          sellerRequests: true,
        },
      },
    );
  // Validate status is pending
  if (request.request_status !== "pending") {
    throw new HttpException("Request is not pending", 400);
  }
  // Validate status transition
  const newStatus = props.body.status;
  if (newStatus !== "approved" && newStatus !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  // Validate rejection reason if rejecting
  if (newStatus === "rejected" && !props.body.rejection_reason) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // Create snapshot for status change
  await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.create({
    data: {
      id: v4(),
      reason: request.reason,
      request_status: newStatus,
      created_at: toISOStringSafe(request.created_at),
      changed_at: toISOStringSafe(new Date()),
      changed_by: props.admin.id,
      ecommerce_mall_admin_request_request_id: request.id,
    },
  });
  // Update request status
  const updated =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.update({
      where: { id: props.adminRequestId },
      data: {
        request_status: newStatus,
        updated_at: toISOStringSafe(new Date()),
      },
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: EcommerceMallAdminAtSummaryTransformer.select(),
        snapshots: EcommerceMallAdminRequestSnapshotTransformer.select(),
        customerRequests:
          EcommerceMallAdminRequestRequestOfCustomerTransformer.select(),
        sellerRequests:
          EcommerceMallAdminRequestRequestOfSellerTransformer.select(),
      },
    });
  return await EcommerceMallAdminRequestRequestTransformer.transform(updated);
}
