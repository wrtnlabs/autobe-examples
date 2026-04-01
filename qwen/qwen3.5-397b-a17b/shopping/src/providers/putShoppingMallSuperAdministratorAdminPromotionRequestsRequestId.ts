import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdminPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPromotionRequest";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { SuperadministratorPayload } from "../decorators/payload/SuperadministratorPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallSuperAdministratorAdminPromotionRequestsRequestId(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
  body: IShoppingMallAdminPromotionRequest.IUpdate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is no longer pending", 409);
  }
  if (!props.body.status) {
    throw new HttpException("Status update is required", 400);
  }
  if (props.body.status !== "approved" && props.body.status !== "rejected") {
    throw new HttpException("Invalid status value", 400);
  }
  if (props.body.status === "rejected") {
    if (
      !props.body.rejection_reason ||
      props.body.rejection_reason.trim().length === 0
    ) {
      throw new HttpException(
        "Rejection reason is required when rejecting",
        400,
      );
    }
  }
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
      where: { id: props.requestId },
      data: {
        status: props.body.status,
        rejection_reason:
          props.body.status === "rejected"
            ? props.body.rejection_reason!
            : null,
        updated_at: new Date(),
      },
    });
  await MyGlobal.prisma.shopping_mall_admin_promotion_request_snapshots.create({
    data: {
      id: v4(),
      shopping_mall_admin_promotion_request_id: props.requestId,
      responding_super_administrator_id: props.superAdministrator.id,
      actor_type: request.actor_type,
      status: props.body.status,
      reason:
        props.body.status === "rejected" ? props.body.rejection_reason! : null,
      created_at: new Date(),
    },
  });
  if (props.body.status === "approved") {
    if (request.actor_type === "customer") {
      const customerRequest =
        await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_customers.findUniqueOrThrow(
          {
            where: {
              shopping_mall_admin_promotion_request_id: props.requestId,
            },
            include: {
              customer: true,
            },
          },
        );
      const existingAdmin =
        await MyGlobal.prisma.shopping_mall_administrators.findUnique({
          where: { email: customerRequest.customer.email },
        });
      if (!existingAdmin) {
        await MyGlobal.prisma.shopping_mall_administrators.create({
          data: {
            id: v4(),
            email: customerRequest.customer.email,
            password_hash: customerRequest.customer.password_hash,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    } else if (request.actor_type === "seller") {
      const sellerRequest =
        await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_sellers.findUniqueOrThrow(
          {
            where: {
              shopping_mall_admin_promotion_request_id: props.requestId,
            },
            include: {
              seller: true,
            },
          },
        );
      const existingAdmin =
        await MyGlobal.prisma.shopping_mall_administrators.findUnique({
          where: { email: sellerRequest.seller.email },
        });
      if (!existingAdmin) {
        await MyGlobal.prisma.shopping_mall_administrators.create({
          data: {
            id: v4(),
            email: sellerRequest.seller.email,
            password_hash: sellerRequest.seller.password_hash,
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
          },
        });
      }
    }
  }
  const fullRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(
    fullRequest,
  );
}
