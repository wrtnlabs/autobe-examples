import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallCustomerTransformer {
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
        sessions: { select: {} },
        passwordResets: { select: {} },
        emailVerifications: { select: {} },
        saleReviews: { select: {} },
        saleReviewVotes: { select: {} },
        saleQuestions: { select: {} },
        favorites: { select: {} },
        orders: { select: {} },
        cancellationRequests: { select: {} },
        refundRequests: { select: {} },
        reviews: { select: {} },
        productReviews: { select: {} },
        userNotifications: { select: {} },
        notificationPreferences: { select: {} },
        bannedUser: { select: {} },
      },
    } satisfies Prisma.shopping_mall_customersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallCustomer> {
    return {
      id: input.id,
      email: input.email,
      displayName: input.display_name ?? null,
      phoneNumber: input.phone_number ?? null,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
