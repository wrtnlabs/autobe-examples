import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequest";
import { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceMallAdminRequestTransformer } from "../transformers/EcommerceMallAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceMallAdminAdminRequestsAdminRequestId(props: {
  admin: AdminPayload;
  adminRequestId: string;
  body: IEcommerceMallAdminRequest.IUpdate;
}): Promise<IEcommerceMallAdminRequest> {
  // 1) Verify super admin grade
  const admin = await MyGlobal.prisma.ecommerce_mall_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true, grade: true },
  });
  if (admin.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2) Load pending request
  const request =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: props.adminRequestId },
      select: { id: true, user_id: true, status: true },
    });
  if (request.status !== "pending") {
    throw new HttpException(`Request already ${request.status}`, 400);
  }
  // 3) Perform transaction
  const now = new Date();
  const requestId: string & tags.Format<"uuid"> =
    props.adminRequestId as string & tags.Format<"uuid">;
  if (props.body.status === "approved") {
    if (!props.body.approval_notes) {
      throw new HttpException("Approval notes required", 400);
    }
    const adminRoleId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    const adminRole = await MyGlobal.prisma.ecommerce_mall_admin_roles.create({
      data: {
        id: adminRoleId,
        user_id: request.user_id,
        grade: "regular",
        created_at: now,
        updated_at: now,
      },
    });
    await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
      where: { id: requestId },
      data: {
        status: "approved",
        super_admin_id: props.admin.id,
        admin_role_id: adminRole.id,
        approval_notes: props.body.approval_notes,
        responded_at: now,
      },
    });
  } else {
    if (!props.body.rejection_reason) {
      throw new HttpException("Rejection reason required", 400);
    }
    await MyGlobal.prisma.ecommerce_mall_admin_requests.update({
      where: { id: requestId },
      data: {
        status: "rejected",
        super_admin_id: props.admin.id,
        rejection_reason: props.body.rejection_reason,
        responded_at: now,
      },
    });
  }
  // 4) Log admin action
  await MyGlobal.prisma.ecommerce_mall_admin_action_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      ecommerce_mall_admin_id: props.admin.id,
      action_type:
        props.body.status === "approved"
          ? "admin_request.approval"
          : "admin_request.rejection",
      target_id: requestId,
      description:
        props.body.approval_notes ??
        props.body.rejection_reason ??
        "Admin request processed",
      created_at: now,
      updated_at: now,
    },
  });
  // 5) Fetch and return updated request
  const updated =
    await MyGlobal.prisma.ecommerce_mall_admin_requests.findUniqueOrThrow({
      where: { id: requestId },
      ...EcommerceMallAdminRequestTransformer.select(),
    });
  return await EcommerceMallAdminRequestTransformer.transform(updated);
}
