import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";
import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { AdminPayload } from "../decorators/payload/AdminPayload";

export async function putShoppingMallAdminConfigurationsConfigurationId(props: {
  admin: AdminPayload;
  configurationId: string & tags.Format<"uuid">;
  body: IShoppingMallConfiguration.IUpdate;
}): Promise<IShoppingMallConfiguration> {
  // Verify configuration exists
  const existingConfig =
    await MyGlobal.prisma.shopping_mall_configurations.findUnique({
      where: { id: props.configurationId },
    });
  if (!existingConfig) {
    throw new HttpException("Configuration not found", 404);
  }
  // Parse the existing config value as JSON (it's stored as a JSONB string in the database)
  let configRaw: any;
  try {
    configRaw = JSON.parse(existingConfig.value);
  } catch (error) {
    throw new HttpException("Invalid configuration data format", 500);
  }
  // Initialize currentConfig with default values from existing config
  const currentConfig: IShoppingMallConfiguration = {
    currency:
      (configRaw.currency as string & tags.Pattern<"^[A-Z]{3}$">) ?? "USD",
    timezone:
      (configRaw.timezone as string & tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">) ??
      "Asia/Seoul",
    locale:
      (configRaw.locale as string & tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">) ??
      "en-US",
    payment_gateway:
      (configRaw.payment_gateway as
        | "stripe"
        | "paypal"
        | "razorpay"
        | "square") ?? "stripe",
    tax_calculation:
      (configRaw.tax_calculation as "standard" | "reverse" | "exempt") ??
      "standard",
    shipping_rate_strategy:
      (configRaw.shipping_rate_strategy as
        | "flat"
        | "weight_based"
        | "free_threshold"
        | "tiered") ?? "flat",
    feature_toggles: {
      allow_seller_registration:
        configRaw.feature_toggles?.allow_seller_registration ?? false,
      require_email_verification:
        configRaw.feature_toggles?.require_email_verification ?? false,
      enable_product_reviews:
        configRaw.feature_toggles?.enable_product_reviews ?? false,
      auto_approve_sellers:
        configRaw.feature_toggles?.auto_approve_sellers ?? false,
      allow_guest_checkout:
        configRaw.feature_toggles?.allow_guest_checkout ?? false,
      use_dynamic_pricing:
        configRaw.feature_toggles?.use_dynamic_pricing ?? false,
      enable_live_chat: configRaw.feature_toggles?.enable_live_chat ?? false,
      allow_bulk_product_import:
        configRaw.feature_toggles?.allow_bulk_product_import ?? false,
    },
    created_at:
      (configRaw.created_at as string & tags.Format<"date-time">) ??
      toISOStringSafe(new Date()),
    updated_at:
      (configRaw.updated_at as string & tags.Format<"date-time">) ??
      toISOStringSafe(new Date()),
  };
  // Validate and update the config based on the body value
  if (props.body.value !== undefined) {
    switch (existingConfig.key) {
      case "currency":
        if (
          typeof props.body.value !== "string" ||
          !/^[A-Z]{3}$/.test(props.body.value)
        ) {
          throw new HttpException(
            "Invalid currency format. Must be ISO 4217 3-letter code.",
            400,
          );
        }
        currentConfig.currency = props.body.value as string &
          tags.Pattern<"^[A-Z]{3}$">;
        break;
      case "timezone":
        if (
          typeof props.body.value !== "string" ||
          !/^[A-Za-z]+/[A - Za - z_] + $ / i.test(props.body.value)
        ) {
          throw new HttpException(
            "Invalid timezone format. Must be IANA timezone format.",
            400,
          );
        }
        currentConfig.timezone = props.body.value as string &
          tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">;
        break;
      case "locale":
        if (
          typeof props.body.value !== "string" ||
          !/^[a-z]{2}-[A-Z]{2}$/.test(props.body.value)
        ) {
          throw new HttpException(
            "Invalid locale format. Must be BCP 47 language-country format.",
            400,
          );
        }
        currentConfig.locale = props.body.value as string &
          tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">;
        break;
      case "payment_gateway":
        if (
          typeof props.body.value !== "string" ||
          !["stripe", "paypal", "razorpay", "square"].includes(props.body.value)
        ) {
          throw new HttpException(
            "Invalid payment_gateway value. Allowed: 'stripe', 'paypal', 'razorpay', 'square'.",
            400,
          );
        }
        currentConfig.payment_gateway = props.body.value as
          | "stripe"
          | "paypal"
          | "razorpay"
          | "square";
        break;
      case "tax_calculation":
        if (
          typeof props.body.value !== "string" ||
          !["standard", "reverse", "exempt"].includes(props.body.value)
        ) {
          throw new HttpException(
            "Invalid tax_calculation value. Allowed: 'standard', 'reverse', 'exempt'.",
            400,
          );
        }
        currentConfig.tax_calculation = props.body.value as
          | "standard"
          | "reverse"
          | "exempt";
        break;
      case "shipping_rate_strategy":
        if (
          typeof props.body.value !== "string" ||
          !["flat", "weight_based", "free_threshold", "tiered"].includes(
            props.body.value,
          )
        ) {
          throw new HttpException(
            "Invalid shipping_rate_strategy value. Allowed: 'flat', 'weight_based', 'free_threshold', 'tiered'.",
            400,
          );
        }
        currentConfig.shipping_rate_strategy = props.body.value as
          | "flat"
          | "weight_based"
          | "free_threshold"
          | "tiered";
        break;
      case "feature_toggles":
        if (typeof props.body.value !== "object" || props.body.value === null) {
          throw new HttpException(
            "Invalid feature_toggles value. Must be an object with boolean properties.",
            400,
          );
        }
        // Validate that feature_toggles is an object with boolean properties
        const featureToggles = props.body.value as {
          allow_seller_registration?: boolean;
          require_email_verification?: boolean;
          enable_product_reviews?: boolean;
          auto_approve_sellers?: boolean;
          allow_guest_checkout?: boolean;
          use_dynamic_pricing?: boolean;
          enable_live_chat?: boolean;
          allow_bulk_product_import?: boolean;
        };
        currentConfig.feature_toggles = {
          allow_seller_registration:
            featureToggles.allow_seller_registration ??
            currentConfig.feature_toggles.allow_seller_registration,
          require_email_verification:
            featureToggles.require_email_verification ??
            currentConfig.feature_toggles.require_email_verification,
          enable_product_reviews:
            featureToggles.enable_product_reviews ??
            currentConfig.feature_toggles.enable_product_reviews,
          auto_approve_sellers:
            featureToggles.auto_approve_sellers ??
            currentConfig.feature_toggles.auto_approve_sellers,
          allow_guest_checkout:
            featureToggles.allow_guest_checkout ??
            currentConfig.feature_toggles.allow_guest_checkout,
          use_dynamic_pricing:
            featureToggles.use_dynamic_pricing ??
            currentConfig.feature_toggles.use_dynamic_pricing,
          enable_live_chat:
            featureToggles.enable_live_chat ??
            currentConfig.feature_toggles.enable_live_chat,
          allow_bulk_product_import:
            featureToggles.allow_bulk_product_import ??
            currentConfig.feature_toggles.allow_bulk_product_import,
        };
        break;
      default:
        throw new HttpException("Unknown configuration key.", 400);
    }
  }
  // Update description if provided
  if (props.body.description !== undefined) {
    // Note: Description field exists in shopping_mall_configurations table, but not in IShoppingMallConfiguration type
    // This is handled by the database update, not the IShoppingMallConfiguration type
  }
  // Update updated_at
  currentConfig.updated_at = toISOStringSafe(new Date());
  // Create snapshot of pre-update state
  const snapshotData = {
    id: v4(),
    key: existingConfig.key,
    value: existingConfig.value,
    description: existingConfig.description,
    created_at: existingConfig.created_at ?? toISOStringSafe(new Date()),
    updated_at: toISOStringSafe(new Date()),
    updated_by_id: props.admin.id,
    updated_by_session_id: props.admin.session_id,
    category: existingConfig.category,
    enabled: existingConfig.enabled,
  };
  // Create audit log entry
  await MyGlobal.prisma.shopping_mall_configurations.create({
    data: snapshotData,
  });
  // Update the configuration record in database
  const updatedRecord =
    await MyGlobal.prisma.shopping_mall_configurations.update({
      where: { id: props.configurationId },
      data: {
        value: JSON.stringify(currentConfig), // Convert object back to JSON string
        description: props.body.description, // Update description field
        updated_at: currentConfig.updated_at,
      },
    });
  // Return the updated configuration
  return currentConfig;
}
