import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallAdminAtSummaryTransformer {
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
        shopping_mall_admin_sessions: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_audit_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_disputes: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_votes: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_moderation_logs: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_adminsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallAdmin.ISummary> {
    return {
      id: input.id,
      email: input.email,
      username: "", // Cannot map - field doesn't exist in schema
      is_active: false, // Cannot map - field doesn't exist in schema
      department: "", // Cannot map - field doesn't exist in schema
      title: "", // Cannot map - field doesn't exist in schema
    };
  }
}
