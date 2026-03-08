import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallAdminAdminRequestRequestsAdminRequestIdReject(props: {
  admin: AdminPayload;
  adminRequestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequestRequest.IRejectRequest;
}): Promise<IEcommerceMallAdminRequestRequest.IRejection> {
  // Authorization: Check if admin exists and is not banned
  const currentAdmin = await MyGlobal.prisma.ecommerce_mall_admins.findUnique({
    where: { id: props.admin.id },
    select: { id: true, is_banned: true },
  });
  if (currentAdmin === null || currentAdmin.is_banned) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch the admin request with relation data for requester_info
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.adminRequestId },
        include: {
          customerRequests: true,
          sellerRequests: true,
        },
      },
    );
  // Validate request status is pending
  if (adminRequest.request_status !== "pending") {
    throw new HttpException("Request is not in pending status", 409);
  }
  // Update the admin request to rejected status
  const updatedRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.update({
      where: { id: props.adminRequestId },
      data: {
        request_status: "rejected",
        updated_at: new Date(),
      },
      include: {
        customerRequests: true,
        sellerRequests: true,
      },
    });
  // Build requester_info from relation data
  const requesterType = adminRequest.customerRequests
    ? ("customer" as const)
    : ("seller" as const);
  const requesterId = adminRequest.customerRequests
    ? adminRequest.customerRequests.id
    : adminRequest.sellerRequests!.id;
  return {
    id: updatedRequest.id,
    reason: updatedRequest.reason,
    request_status: "rejected",
    created_at: toISOStringSafe(updatedRequest.created_at),
    updated_at: updatedRequest.updated_at.toISOString(),
    requester_info: {
      id: requesterId,
      type: requesterType,
    },
  } satisfies IEcommerceMallAdminRequestRequest.IRejection;
}
