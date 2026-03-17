import { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEcommerceMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminPromotionRequest";
import { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EcommerceMallAdminPromotionRequestCollector } from "../collectors/EcommerceMallAdminPromotionRequestCollector";
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
  if (existingPending !== null) {
    throw new HttpException(
      "You already have a pending promotion request",
      400,
    );
  }
  // Collect data for the promotion request
  const requestData = await EcommerceMallAdminPromotionRequestCollector.collect(
    {
      body: props.body,
    },
  );
  // Create the main promotion request record
  const createdRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.create({
      data: requestData,
    });
  // Create the polymorphic subtype linking request to customer
  await MyGlobal.prisma.ecommerce_mall_admin_promotion_request_customers.create(
    {
      data: {
        id: v4(),
        admin_promotion_request_id: createdRequest.id,
        customer_id: props.customer.id satisfies string as string,
        created_at: new Date(),
        updated_at: new Date(),
      },
    },
  );
  // Fetch the complete record with relations and transform
  const completeRequest =
    await MyGlobal.prisma.ecommerce_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: createdRequest.id },
        ...EcommerceMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await EcommerceMallAdminPromotionRequestTransformer.transform(
    completeRequest,
  );
}
