import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminTransformer {
  export type Payload = Prisma.shopping_mall_adminsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        role_grade: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        sessions: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_admin_sessionsFindManyArgs,
        passwordResets: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_admin_password_resetsFindManyArgs,
        migrations: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_system_migrationsFindManyArgs,
        cacheInvalidationLogs: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_system_cache_trackingsFindManyArgs,
        suspensionInitiateds: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_seller_suspensionsFindManyArgs,
        suspensionsApproveds: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_seller_suspensionsFindManyArgs,
        verifiedSellers: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_seller_verificationsFindManyArgs,
        processedExports: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_seller_exportsFindManyArgs,
        cancelledCancellationRequests: {
          select: { id: true },
        } satisfies Prisma.shopping_mall_order_cancellation_requestsFindManyArgs,
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
    return {
      id: input.id,
      reason: "pending",
      status: "pending",
      created_at: input.created_at.toISOString(),
      approved_at: null,
      rejected_at: null,
      rejection_reason: null,
      requester: {
        id: input.id,
        email: input.email,
        created_at: input.created_at.toISOString(),
        updated_at: input.updated_at.toISOString(),
        display_name: null,
        phone_number: null,
        email_verified: false,
      } satisfies IShoppingMallCustomer.ISummary,
    };
  }
}
