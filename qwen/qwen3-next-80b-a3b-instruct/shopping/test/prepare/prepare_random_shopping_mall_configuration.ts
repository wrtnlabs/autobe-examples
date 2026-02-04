import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
export function prepare_random_shopping_mall_configuration(
  input?: DeepPartial<IShoppingMallConfiguration.ICreate>,
): IShoppingMallConfiguration.ICreate {
  return {
    currency:
      input?.currency ??
      RandomGenerator.pick(["USD", "EUR", "JPY", "KRW", "GBP"] as const),
    payment:
      input?.payment ??
      RandomGenerator.pick([
        "stripe",
        "paypal",
        "square",
        "razorpay",
        "klarna",
      ] as const),
    tax:
      input?.tax ??
      typia.random<
        number & tags.Type<"float"> & tags.Minimum<0> & tags.Maximum<0.3>
      >(),
    email: input?.email ?? typia.random<string & tags.Format<"email">>(),
    category:
      input?.category ??
      RandomGenerator.pick([
        "electronics",
        "books",
        "clothing",
        "home",
        "sports",
      ] as const),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "Asia/Tokyo",
        "America/New_York",
        "Europe/London",
        "Australia/Sydney",
      ] as const),
    currency_exchange_rate_source:
      input?.currency_exchange_rate_source ??
      RandomGenerator.pick([
        "openexchangerates",
        "fixer",
        "central_bank",
        "manual",
      ] as const),
    default_language:
      input?.default_language ??
      RandomGenerator.pick([
        "en-US",
        "ko-KR",
        "ja-JP",
        "zh-CN",
        "es-ES",
      ] as const),
    api_rate_limit:
      input?.api_rate_limit ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<100>
      >(),
    checkout_timeout_minutes:
      input?.checkout_timeout_minutes ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<5> & tags.Maximum<30>
      >(),
    enable_guest_checkout:
      input?.enable_guest_checkout ??
      RandomGenerator.pick([true, false] as const),
    min_order_value_for_free_shipping:
      input?.min_order_value_for_free_shipping ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<10000>
      >(),
    max_shipping_days:
      input?.max_shipping_days ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<15>
      >(),
    return_period_days:
      input?.return_period_days ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<14> & tags.Maximum<60>
      >(),
    tax_inclusive_pricing:
      input?.tax_inclusive_pricing ??
      RandomGenerator.pick([true, false] as const),
    product_search_enabled:
      input?.product_search_enabled ??
      RandomGenerator.pick([true, false] as const),
    enable_catalog_search:
      input?.enable_catalog_search ??
      RandomGenerator.pick([true, false] as const),
    inventory_reservation_enabled:
      input?.inventory_reservation_enabled ??
      RandomGenerator.pick([true, false] as const),
    shipping_tax_calculation:
      input?.shipping_tax_calculation ??
      RandomGenerator.pick(["included", "separate", "automatic"] as const),
    customer_service_phone:
      input?.customer_service_phone ?? RandomGenerator.mobile("+82"),
    order_number_prefix:
      input?.order_number_prefix ??
      RandomGenerator.pick(["ORD", "SHOP", "INV", "SL"] as const),
    gift_card_enabled:
      input?.gift_card_enabled ?? RandomGenerator.pick([true, false] as const),
    affiliate_program_enabled:
      input?.affiliate_program_enabled ??
      RandomGenerator.pick([true, false] as const),
    referral_program_enabled:
      input?.referral_program_enabled ??
      RandomGenerator.pick([true, false] as const),
    newsletter_subscription_enabled:
      input?.newsletter_subscription_enabled ??
      RandomGenerator.pick([true, false] as const),
    marketing_emails_enabled:
      input?.marketing_emails_enabled ??
      RandomGenerator.pick([true, false] as const),
    default_shipping_method:
      input?.default_shipping_method ??
      RandomGenerator.pick([
        "standard",
        "express",
        "overnight",
        "pickup",
      ] as const),
    max_items_per_cart:
      input?.max_items_per_cart ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<20> & tags.Maximum<100>
      >(),
    order_confirmation_template:
      input?.order_confirmation_template ??
      RandomGenerator.pick([
        "standard",
        "premium",
        "simple",
        "extended",
      ] as const),
    return_policy_url:
      input?.return_policy_url ?? typia.random<string & tags.Format<"url">>(),
    payment_method_display_order:
      input?.payment_method_display_order ??
      RandomGenerator.pick([
        "stripe,paypal,credit_card",
        "paypal,stripe,credit_card",
        "credit_card,stripe,paypal",
      ] as const),
    minimum_password_length:
      input?.minimum_password_length ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<20>
      >(),
    captcha_enabled:
      input?.captcha_enabled ?? RandomGenerator.pick([true, false] as const),
    enable_email_notifications:
      input?.enable_email_notifications ??
      RandomGenerator.pick([true, false] as const),
    enable_sms_notifications:
      input?.enable_sms_notifications ??
      RandomGenerator.pick([true, false] as const),
    notification_email:
      input?.notification_email ??
      typia.random<string & tags.Format<"email">>(),
    support_email:
      input?.support_email ?? typia.random<string & tags.Format<"email">>(),
    default_category_id:
      input?.default_category_id ??
      typia.random<string & tags.Format<"uuid">>(),
    max_product_images:
      input?.max_product_images ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<10>
      >(),
    allowed_file_extensions:
      input?.allowed_file_extensions ??
      RandomGenerator.pick([
        "jpg,jpeg,png,gif,pdf",
        "webp,jpg,png,jpeg",
        "png,jpeg",
      ] as const),
  };
}
