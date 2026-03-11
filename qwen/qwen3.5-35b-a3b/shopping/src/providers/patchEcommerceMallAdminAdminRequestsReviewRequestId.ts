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
import { EcommerceMallAdminRequestRequestTransformer } from "../transformers/EcommerceMallAdminRequestRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchEcommerceMallAdminAdminRequestsReviewRequestId(props: {
  admin: AdminPayload;
  requestId: string & tags.Format<"uuid">;
  body: IEcommerceMallAdminRequestRequest.IReview;
}): Promise<IEcommerceMallAdminRequestRequest> {
  // Step 1: Fetch the admin request and verify it's in pending status
  const adminRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallAdminRequestRequestTransformer.select(),
      },
    );
  // Validate request status is pending before allowing review
  if (adminRequest.request_status !== "pending") {
    throw new HttpException("Cannot review a request that is not pending", 400);
  }
  // Step 2: Update the request status based on the review decision
  const newStatus: "approved" | "rejected" =
    props.body.action === "approve" ? "approved" : "rejected";
  const updated =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.update({
      where: { id: props.requestId },
      data: {
        request_status: newStatus,
        updated_at: new Date(),
      },
      ...EcommerceMallAdminRequestRequestTransformer.select(),
    });
  // Step 3: Create an immutable audit snapshot for the status change
  await MyGlobal.prisma.ecommerce_mall_admin_request_snapshots.create({
    data: {
      id: v4(),
      reason: adminRequest.reason,
      request_status: newStatus,
      created_at: adminRequest.created_at,
      changed_at: new Date(),
      adminRequest: {
        connect: { id: props.requestId },
      },
      changedBy: {
        connect: { id: props.admin.id },
      },
    },
  });
  // Step 4: Fetch and return the updated request with full data
  const final =
    await MyGlobal.prisma.ecommerce_mall_admin_request_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...EcommerceMallAdminRequestRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminRequestRequestTransformer.transform(final);
}
