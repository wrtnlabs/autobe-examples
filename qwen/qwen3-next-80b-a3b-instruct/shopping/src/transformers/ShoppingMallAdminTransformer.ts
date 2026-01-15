import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

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
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_admin_sessions: true,
        shopping_mall_payment_audit_logs: true,
        shopping_mall_payment_disputes: true,
        shopping_mall_review_votes: true,
        shopping_mall_review_moderation_logs: true,
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IShoppingMallAdmin> {
    return {
      id: input.id,
      name: "Unknown Admin", // Placeholder: database schema has no name field - system compound error
      email: input.email,
      createdAt: input.created_at.toISOString(),
      role: "unknown", // Placeholder: database schema has no role field - system compound error
      status: "inactive", // Placeholder: database schema has no status field - system compound error
      permissions: [], // Placeholder: database schema has no permissions field - system compound error
    };
  }
}
