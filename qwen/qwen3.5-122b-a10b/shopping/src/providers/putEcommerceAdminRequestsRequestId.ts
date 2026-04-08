import { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import { IEcommerceAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdminRequest";
import { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { EcommerceAdminRequestTransformer } from "../transformers/EcommerceAdminRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putEcommerceAdminRequestsRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceAdminRequest.IUpdate;
}): Promise<IEcommerceAdminRequest> {
  // 1. Verify super administrator
  const adminGrade =
    await MyGlobal.prisma.ecommerce_administrator_grades.findFirst({
      where: {
        ecommerce_admin_id: props.admin.id,
      },
    });
  if (adminGrade?.grade !== "super") {
    throw new HttpException("Forbidden", 403);
  }
  // 2. Fetch and validate the request
  const request = await MyGlobal.prisma.ecommerce_admin_requests.findUnique({
    where: { id: props.requestId },
  });
  if (!request) {
    throw new HttpException("Not Found", 404);
  }
  if (request.status !== "pending") {
    throw new HttpException("Request is not in pending status", 409);
  }
  // 3. Validate status and rejection_reason
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  if (props.body.status === "rejected" && !props.body.rejection_reason) {
    throw new HttpException("Rejection reason is required", 400);
  }
  // 4. Check for duplicate pending requests
  const duplicateWhere =
    request.requester_type === "customer"
      ? {
          requester_type: "customer",
          requester_customer_id: request.requester_customer_id,
        }
      : {
          requester_type: "seller",
          requester_seller_id: request.requester_seller_id,
        };
  const duplicateCheck =
    await MyGlobal.prisma.ecommerce_admin_requests.findFirst({
      where: {
        ...duplicateWhere,
        status: "pending",
        id: { not: props.requestId },
      },
    });
  if (duplicateCheck) {
    throw new HttpException("Duplicate pending request exists", 409);
  }
  // 5. Update the request
  const now = new Date();
  await MyGlobal.prisma.ecommerce_admin_requests.update({
    where: { id: props.requestId },
    data: {
      status: props.body.status,
      reviewed_by_id: props.admin.id,
      reviewed_at: toISOStringSafe(now),
      rejection_reason:
        props.body.status === "rejected" ? props.body.rejection_reason : null,
      updated_at: toISOStringSafe(now),
    },
  });
  // 6. If approved, assign administrator grade
  if (props.body.status === "approved") {
    const requesterId =
      request.requester_type === "customer"
        ? request.requester_customer_id
        : request.requester_seller_id;
    if (requesterId === null) {
      throw new HttpException("Requester ID is missing", 500);
    }
    await MyGlobal.prisma.ecommerce_administrator_grades.create({
      data: {
        id: v4(),
        ecommerce_admin_id: requesterId,
        grade: "regular",
        created_at: toISOStringSafe(now),
        updated_at: toISOStringSafe(now),
      },
    });
  }
  // 7. Fetch and return the updated request
  const updated =
    await MyGlobal.prisma.ecommerce_admin_requests.findUniqueOrThrow({
      where: { id: props.requestId },
      ...EcommerceAdminRequestTransformer.select(),
    });
  return await EcommerceAdminRequestTransformer.transform(updated);
}
