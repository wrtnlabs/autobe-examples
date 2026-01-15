import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerAtSummaryTransformer {
  export type Payload = Prisma.shopping_mall_sellersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        email: true,
        password_hash: true,
        name: true,
        store_name: true,
        description: true,
        logo_url: true,
        is_verified: true,
        is_active: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_product_answers: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_votes: {
          select: {
            rating: true,
          },
        },
        shopping_mall_seller_sessions: {
          select: {
            updated_at: true,
          },
          orderBy: {
            updated_at: "desc",
          },
        },
        shopping_mall_order_items: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_audit_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_tokenizations: {
          select: {
            id: true,
          },
        },
        shopping_mall_payment_disputes: {
          select: {
            id: true,
          },
        },
        shopping_mall_review_replies: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_verification_documents: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_bank_accounts: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_dashboard_settings: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_onboarding_completion: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_performance_metrics: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_communication_logs: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_compliance_history: {
          select: {
            id: true,
          },
        },
        shopping_mall_seller_subscription_tiers: {
          select: {
            id: true,
          },
        },
        shopping_mall_user_flags: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller.ISummary> {
    return {
      id: input.id,
      business_name: input.store_name,
      status: input.is_active ? "active" : "suspended",
      registration_date: toISOStringSafe(input.created_at),
      email: input.email,
      product_count: input._count.shopping_mall_product_answers,
      avg_rating: Number(input._avg.shopping_mall_review_votes.rating) ?? 0,
      verification_status: input.is_verified ? "verified" : "unverified",
      last_login:
        input.shopping_mall_seller_sessions.length > 0
          ? toISOStringSafe(input.shopping_mall_seller_sessions[0].updated_at)
          : toISOStringSafe(input.created_at),
    };
  }
}
