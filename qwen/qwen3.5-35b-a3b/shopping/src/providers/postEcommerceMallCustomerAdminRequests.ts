import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminRequestRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRequestRequest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminRequestRequest.ICreate;
}): Promise<IEcommerceMallAdminRequestRequest> {
  // Validate reason is not empty or whitespace only
  if (props.body.reason.trim().length === 0) {
    throw new HttpException("Reason cannot be empty", 400);
  }
  // Get customer from database
  const customer = await MyGlobal.prisma.ecommerce_mall_customers.findUnique({
    where: { id: props.customer.id },
    select: { id: true, is_banned: true },
  });
  if (customer === null) {
    throw new HttpException("Customer not found", 404);
  }
  // Check if customer is banned
  if (customer.is_banned) {
    throw new HttpException("Banned customers cannot submit requests", 403);
  }
  // Verify no pending admin request exists
  const existingPendingRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findFirst({
      where: {
        admin: {
          id: props.customer.id,
        },
        request_status: "pending",
        deleted_at: null,
      },
    });
  if (existingPendingRequest !== null) {
    throw new HttpException("Pending admin request already exists", 409);
  }
  // Generate UUID for the request
  const id: string & tags.Format<"uuid"> = v4();
  // Create the admin request record
  const created =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.create({
      data: {
        id,
        reason: props.body.reason,
        request_status: "pending",
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        admin: {
          connect: { id: props.customer.id },
        },
      },
      select: {
        id: true,
        reason: true,
        request_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        admin: {
          select: {
            id: true,
            email: true,
            is_banned: true,
            created_at: true,
            updated_at: true,
          },
        },
      },
    });
  // Transform to response DTO
  const response: IEcommerceMallAdminRequestRequest = {
    id: created.id,
    reason: created.reason,
    request_status: typia.assert<"pending" | "approved" | "rejected">(
      created.request_status,
    ),
    created_at: created.created_at.toISOString(),
    updated_at: created.updated_at.toISOString(),
    deleted_at: created.deleted_at ? created.deleted_at.toISOString() : null,
    admin: {
      id: created.admin.id,
      email: created.admin.email,
      is_banned: created.admin.is_banned,
      created_at: created.admin.created_at.toISOString(),
      updated_at: created.admin.updated_at.toISOString(),
    },
  } satisfies IEcommerceMallAdminRequestRequest;
  return response;
}
