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
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallAdminPromotionRequestTransformer } from "../transformers/ShoppingMallAdminPromotionRequestTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postShoppingMallCustomerAdminPromotionRequests(props: {
  customer: CustomerPayload;
  body: IShoppingMallAdminPromotionRequest.ICreate;
}): Promise<IShoppingMallAdminPromotionRequest> {
  // Cancel any existing pending requests by this customer
  const existingPendingRequest =
    await MyGlobal.prisma.shopping_mall_admin_promotion_request_of_customers.findFirst(
      {
        where: {
          shopping_mall_customer_id: props.customer.id,
          adminPromotionRequest: {
            deleted_at: null,
            status: "pending",
          },
        },
        select: {
          adminPromotionRequest: {
            select: {
              id: true,
            },
          },
        },
      },
    );
  if (existingPendingRequest?.adminPromotionRequest) {
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.update({
      where: { id: existingPendingRequest.adminPromotionRequest.id },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
  }
  // Create new promotion request
  const id = v4();
  const now = new Date();
  const created =
    await MyGlobal.prisma.shopping_mall_admin_promotion_requests.create({
      data: {
        id,
        actor_type: "customer",
        reason: props.body.reason,
        status: "pending",
        rejection_reason: null,
        created_at: now,
        updated_at: now,
        deleted_at: null,
        customerRequest: {
          create: {
            id: v4(),
            shopping_mall_customer_id: props.customer.id,
            shopping_mall_customer_session_id: props.customer.session_id,
            created_at: now,
            updated_at: now,
          },
        },
      },
      ...ShoppingMallAdminPromotionRequestTransformer.select(),
    });
  return await ShoppingMallAdminPromotionRequestTransformer.transform(created);
}
