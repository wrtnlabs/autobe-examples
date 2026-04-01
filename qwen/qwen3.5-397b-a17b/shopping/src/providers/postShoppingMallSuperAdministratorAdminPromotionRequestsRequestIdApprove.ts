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

export async function postShoppingMallSuperAdministratorAdminPromotionRequestsRequestIdApprove(props: {
  superAdministrator: SuperadministratorPayload;
  requestId: string & tags.Format<"uuid">;
}): Promise<IShoppingMallAdminPromotionRequest> {
  const request =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
      },
    );
  if (request.status !== "pending") {
    throw new HttpException("Request is no longer pending", 400);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.shopping_mall_admin_promotion_requests.update({
      where: { id: props.requestId },
      data: {
        status: "approved",
        updated_at: new Date(),
      },
    });
    await tx.shopping_mall_admin_promotion_request_snapshots.create({
      data: {
        id: v4(),
        shopping_mall_admin_promotion_request_id: props.requestId,
        responding_super_administrator_id: props.superAdministrator.id,
        actor_type: request.actor_type,
        status: "approved",
        created_at: new Date(),
      },
    });
    if (request.actor_type === "customer") {
      const customerRequest =
        await tx.shopping_mall_admin_promotion_request_of_customers.findUnique({
          where: { shopping_mall_admin_promotion_request_id: props.requestId },
        });
      if (customerRequest) {
        const customer = await tx.shopping_mall_customers.findUniqueOrThrow({
          where: { id: customerRequest.shopping_mall_customer_id },
        });
        const passwordHash = await PasswordUtil.hash(customer.email);
        await tx.shopping_mall_administrators.create({
          data: {
            id: v4(),
            email: customer.email,
            password_hash: passwordHash,
            created_at: new Date(),
            updated_at: new Date(),
          },
        });
      }
    }
  });
  const updated =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.findUniqueOrThrow(
      {
        where: { id: props.requestId },
        ...ShoppingMallAdminPromotionRequestTransformer.select(),
      },
    );
  return await ShoppingMallAdminPromotionRequestTransformer.transform(updated);
}
