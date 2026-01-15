import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import { v4 } from "uuid";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallPlatformConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformConfiguration";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

export namespace ShoppingMallPlatformConfigurationCollector {
  export async function collect(props: {
    body: IShoppingMallPlatformConfiguration.ICreate;
  }) {
    return {
      id: v4(),
      branding_title: "",
      branding_logo_url: null,
      payment_gateway_primary: "",
      payment_gateway_secondary: null,
      shipping_carrier_primary: "",
      shipping_carrier_secondary: null,
      currency_code: "",
      tax_calculation_strategy: "",
      email_sender_domain: "",
      default_locale: "",
      max_session_duration_minutes: 0,
      session_inactivity_timeout_minutes: 0,
      password_complexity_min_length: 0,
      password_complexity_require_uppercase: false,
      password_complexity_require_lowercase: false,
      password_complexity_require_numbers: false,
      password_complexity_require_symbols: false,
      login_failed_attempts_threshold: 0,
      login_lockout_duration_minutes: 0,
      ip_blocking_enabled: false,
      fraud_detection_enabled: false,
      email_verification_required: false,
      product_search_enabled: false,
      review_submissions_enabled: false,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    } satisfies Prisma.shopping_mall_platform_configurationsCreateInput;
  }
}
