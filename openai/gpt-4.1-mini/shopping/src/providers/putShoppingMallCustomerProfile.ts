import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { CustomerPayload } from "../decorators/payload/CustomerPayload";
import { ShoppingMallCustomerTransformer } from "../transformers/ShoppingMallCustomerTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putShoppingMallCustomerProfile(props: {
  customer: CustomerPayload;
  body: IShoppingMallCustomer.IUpdate;
}): Promise<IShoppingMallCustomer> {
  const currentCustomer =
    await MyGlobal.prisma.shopping_mall_customers.findUniqueOrThrow({
      where: { id: props.customer.id },
    });
  // Update fields only if explicitly provided
  const dataToUpdate: {
    display_name?: string | null;
    phone_number?: string | null;
    updated_at: Date;
  } = {
    updated_at: new Date(),
  };
  if ("displayName" in props.body) {
    dataToUpdate.display_name = props.body.displayName ?? null;
  }
  if ("phoneNumber" in props.body) {
    dataToUpdate.phone_number = props.body.phoneNumber ?? null;
  }
  const updatedCustomerRaw =
    await MyGlobal.prisma.shopping_mall_customers.update({
      where: { id: props.customer.id },
      data: dataToUpdate,
      include: {
        sessions: true,
        emailVerifications: true,
        passwordResets: true,
        refundRequests: true,
        notificationPreferences: true,
        bannedUser: true,
        cancellationRequests: true,
        reviews: true,
        productReviews: true,
        saleReviewVotes: true,
        saleReviews: true,
        saleQuestions: true,
        favorites: true,
        orders: true,
        userNotifications: true,
      },
    });
  return await ShoppingMallCustomerTransformer.transform(updatedCustomerRaw);
}
