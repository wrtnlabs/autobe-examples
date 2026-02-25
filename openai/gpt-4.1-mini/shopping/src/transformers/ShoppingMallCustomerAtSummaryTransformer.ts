import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_customersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        display_name: true,
        phone_number: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: false,
        passwordResets: false,
        emailVerifications: false,
        saleReviews: false,
        saleReviewVotes: false,
        saleQuestions: false,
        favorites: false,
        orders: false,
        cancellationRequests: false,
        refundRequests: false,
        reviews: false,
        productReviews: false,
        userNotifications: false,
        notificationPreferences: false,
        bannedUser: false,
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer.ISummary> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name ?? undefined,
      phoneNumber: input.phone_number ?? undefined,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
    };
  }
}
