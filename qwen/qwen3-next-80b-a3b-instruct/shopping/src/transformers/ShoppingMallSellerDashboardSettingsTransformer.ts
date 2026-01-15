import { Prisma } from "@prisma/sdk";
import { ArrayUtil } from "@nestia/e2e";
import typia, { tags } from "typia";

import { IShoppingMallSellerDashboardSettings } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerDashboardSettings";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ShoppingMallSellerDashboardSettingsTransformer {
  export type Payload =
    Prisma.shopping_mall_seller_dashboard_settingsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        notification_preferences: true,
        timezone: true,
        language: true,
        default_view: true,
      },
    } satisfies Prisma.shopping_mall_seller_dashboard_settingsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IShoppingMallSellerDashboardSettings> {
    // Safe JSON parsing with fallback
    const pref = input.notification_preferences
      ? JSON.parse(input.notification_preferences)
      : {};
    return {
      notification_level:
        typeof pref.notification_level === "string"
          ? pref.notification_level
          : undefined,
      metrics_visibility: Array.isArray(pref.metrics_visibility)
        ? pref.metrics_visibility
        : undefined,
      default_date_range:
        typeof pref.default_date_range === "string"
          ? pref.default_date_range
          : undefined,
      widget_order: Array.isArray(pref.widget_order)
        ? pref.widget_order
        : undefined,
      auto_refresh_enabled:
        typeof pref.auto_refresh_enabled === "boolean"
          ? pref.auto_refresh_enabled
          : undefined,
      timezone: input.timezone || undefined,
      language:
        input.language !== undefined &&
        (input.language === "en" ||
          input.language === "ko" ||
          input.language === "ja" ||
          input.language === "zh" ||
          input.language === "es" ||
          input.language === "fr" ||
          input.language === "de" ||
          input.language === "pt")
          ? input.language
          : undefined,
      email_notifications_enabled:
        typeof pref.email_notifications_enabled === "boolean"
          ? pref.email_notifications_enabled
          : undefined,
      sms_notifications_enabled:
        typeof pref.sms_notifications_enabled === "boolean"
          ? pref.sms_notifications_enabled
          : undefined,
      dashboard_view:
        input.default_view !== undefined &&
        (input.default_view === "compact" ||
          input.default_view === "expanded" ||
          input.default_view === "analytics-focused" ||
          input.default_view === "dashboard-summary")
          ? input.default_view
          : undefined,
    };
  }
}
