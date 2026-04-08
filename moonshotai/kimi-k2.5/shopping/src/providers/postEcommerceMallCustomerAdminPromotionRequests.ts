import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { EcommerceMallAdminPromotionRequestTransformer } from "../transformers/EcommerceMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postEcommerceMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IEcommerceMallAdminPromotionRequest.ICreate;
}): Promise<IEcommerceMallAdminPromotionRequest> {
  // Check if customer already has a pending promotion request
  const existingPending =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_customers.findFirst(
      {
        where: {
          customer_id: props.customer.id,
          adminPromotionRequest: {
            status: "pending",
            deleted_at: null,
          },
        },
      },
    );
  if (existingPending) {
    throw new HttpException(
      "You already have a pending promotion request",
      409,
    );
  }
  // Generate UUID for the new request
  const requestId = v4() as string & tags.Format<"uuid">;
  // Create the admin promotion request with subtype in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create main request record
    await tx.ecommerce_mall_admin_promotion_requests.create({
      data: {
        id: requestId,
        status: "pending",
        reason: props.body.reason,
        rejection_reason: null,
        reviewer_id: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
    // Create customer subtype linking record
    await tx.ecommerce_mall_admin_promotion_request_customers.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        adminPromotionRequest: { connect: { id: requestId } },
        customer: { connect: { id: props.customer.id } },
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
  // Fetch complete record with relations for response
  const result =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: requestId },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(result);
}
