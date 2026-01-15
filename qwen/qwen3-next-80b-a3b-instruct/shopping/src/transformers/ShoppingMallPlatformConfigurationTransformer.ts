import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallPlatformConfigurationTransformer {
  export type Payload = Prisma.shopping_mall_platform_configurationsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        branding_title: true,
        email_sender_domain: true,
        branding_logo_url: true,
        payment_gateway_primary: true,
        payment_gateway_secondary: true,
        shipping_carrier_primary: true,
        shipping_carrier_secondary: true,
        currency_code: true,
        tax_calculation_strategy: true,
        default_locale: true,
        max_session_duration_minutes: true,
        session_inactivity_timeout_minutes: true,
        password_complexity_min_length: true,
        password_complexity_require_uppercase: true,
        password_complexity_require_lowercase: true,
        password_complexity_require_numbers: true,
        password_complexity_require_symbols: true,
        login_failed_attempts_threshold: true,
        login_lockout_duration_minutes: true,
        ip_blocking_enabled: true,
        fraud_detection_enabled: true,
        email_verification_required: true,
        product_search_enabled: true,
        review_submissions_enabled: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        shopping_mall_config_history: true,
      },
    } satisfies Prisma.shopping_mall_platform_configurationsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallPlatformConfiguration> {
    return {
      config_key: input.id,
      value: input.branding_title,
      description: input.email_sender_domain,
    };
  }
}
