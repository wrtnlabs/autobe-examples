import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerTransformer {
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
        shopping_mall_seller_sessions: true,
        shopping_mall_product_answers: true,
        shopping_mall_order_items: true,
        shopping_mall_payment_audit_logs: true,
        shopping_mall_payment_tokenizations: true,
        shopping_mall_payment_disputes: true,
        shopping_mall_review_votes: true,
        shopping_mall_review_replies: true,
        shopping_mall_seller_verification_documents: true,
        shopping_mall_seller_bank_accounts: true,
        shopping_mall_seller_dashboard_settings: true,
        shopping_mall_seller_onboarding_completion: true,
        shopping_mall_seller_performance_metrics: true,
        shopping_mall_seller_communication_logs: true,
        shopping_mall_seller_compliance_history: true,
        shopping_mall_seller_subscription_tiers: true,
        shopping_mall_user_flags: true,
      },
    } satisfies Prisma.shopping_mall_sellersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSeller> {
    return {
      id: input.id,
      sellerCode: input.store_name,
      businessName: input.store_name,
      legalName: input.name,
      taxId: "",
      email: input.email,
      phone: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      country: "",
      status: input.is_active ? "active_seller" : "suspended",
      termsAccepted: false,
      onboardingCompleted: false,
      verificationDocuments: [],
      complianceStatus: input.is_verified ? "compliant" : "non_compliant",
      businessType: "individual",
      website: "",
      timezone: "Asia/Seoul",
      preferredCurrency: "KRW",
      commissionRate: 0.15,
      accountSecurityLevel: "basic",
      securityDevices: [],
      defaultShippingMethod: "",
      defaultPaymentMethod: "",
      accessLevel: "standard",
      subscriptionTier: "free",
    };
  }
}
