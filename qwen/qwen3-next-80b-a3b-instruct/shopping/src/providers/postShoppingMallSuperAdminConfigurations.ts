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
import { SuperadminPayload } from "../decorators/payload/SuperadminPayload";
import { ShoppingMallConfigurationCollector } from "../collectors/ShoppingMallConfigurationCollector";

export async function postShoppingMallSuperAdminConfigurations(props: {
  superAdmin: SuperadminPayload;
  body: IShoppingMallConfiguration.ICreate;
}): Promise<IShoppingMallConfiguration> {
  // Get all existing configuration records
  const existingConfigs =
    await MyGlobal.prisma.shopping_mall_configurations.findMany({
      where: {},
      select: {
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Build current configuration object from existing records
  const currentConfig: Record<string, any> = {};
  for (const config of existingConfigs) {
    // Parse the string value as JSON if it's a JSON structure
    try {
      // First try parsing as full object
      const parsed = JSON.parse(config.value as string);
      if (typeof parsed === "object" && parsed !== null) {
        currentConfig[config.key] = parsed;
      } else {
        // If not an object, use the raw value
        currentConfig[config.key] = config.value;
      }
    } catch (e) {
      // If parsing fails, use the raw string value
      currentConfig[config.key] = config.value;
    }
  }
  // Update with new values from request
  for (const [key, value] of Object.entries(props.body)) {
    currentConfig[key] = value;
  }
  // Update or create each configuration value individually
  // Iterate over all keys we need to update (both existing and new)
  const configKeys = new Set([
    ...Object.keys(currentConfig),
    ...Object.keys(props.body),
  ]);
  // Update all records
  const updates = [];
  for (const key of configKeys) {
    const value = currentConfig[key];
    // Prepare value for storage - convert to string if needed
    const valueStr =
      typeof value === "object" ? JSON.stringify(value) : value.toString();
    // Use the existing collector to construct the database input
    // The collector already handles structured conversion properly
    const dbInput = await ShoppingMallConfigurationCollector.collect({
      body: { [key]: value },
    });
    // Update existing record or create new
    const result = await MyGlobal.prisma.shopping_mall_configurations.upsert({
      where: { key: key },
      create: {
        id: key,
        key: key,
        value: valueStr,
        category: dbInput.category || "",
        description: dbInput.description || "",
        enabled: dbInput.enabled || false,
        created_at: dbInput.created_at,
        updated_at: dbInput.updated_at,
      },
      update: {
        value: valueStr,
        updated_at: dbInput.updated_at,
        category: dbInput.category || "",
        description: dbInput.description || "",
        enabled: dbInput.enabled || false,
      },
    });
    updates.push(result);
  }
  // Rebuild the full configuration from persisted data
  const finalConfigs =
    await MyGlobal.prisma.shopping_mall_configurations.findMany({
      where: {},
      select: {
        key: true,
        value: true,
        created_at: true,
        updated_at: true,
      },
    });
  // Reconstruct interface from stored data
  const reconstructedConfig: Record<string, any> = {};
  for (const config of finalConfigs) {
    try {
      // Parse as JSON object first
      const parsed = JSON.parse(config.value as string);
      if (typeof parsed === "object" && parsed !== null) {
        reconstructedConfig[config.key] = parsed;
      } else {
        // If not an object, use the raw value
        reconstructedConfig[config.key] = config.value;
      }
    } catch (e) {
      reconstructedConfig[config.key] = config.value;
    }
  }
  // Construct the final IShoppingMallConfiguration with all fields
  return {
    currency:
      (reconstructedConfig.currency as string & tags.Pattern<"^[A-Z]{3}$">) ||
      "USD",
    timezone:
      (reconstructedConfig.timezone as string &
        tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">) || "Asia/Seoul",
    locale:
      (reconstructedConfig.locale as string &
        tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">) || "ko-KR",
    payment_gateway:
      (reconstructedConfig.payment_gateway as
        | "stripe"
        | "paypal"
        | "razorpay"
        | "square") || "stripe",
    tax_calculation:
      (reconstructedConfig.tax_calculation as
        | "standard"
        | "reverse"
        | "exempt") || "standard",
    shipping_rate_strategy:
      (reconstructedConfig.shipping_rate_strategy as
        | "flat"
        | "weight_based"
        | "free_threshold"
        | "tiered") || "flat",
    feature_toggles: {
      allow_seller_registration:
        reconstructedConfig.feature_toggles?.allow_seller_registration ?? true,
      require_email_verification:
        reconstructedConfig.feature_toggles?.require_email_verification ?? true,
      enable_product_reviews:
        reconstructedConfig.feature_toggles?.enable_product_reviews ?? true,
      auto_approve_sellers:
        reconstructedConfig.feature_toggles?.auto_approve_sellers ?? false,
      allow_guest_checkout:
        reconstructedConfig.feature_toggles?.allow_guest_checkout ?? true,
      use_dynamic_pricing:
        reconstructedConfig.feature_toggles?.use_dynamic_pricing ?? false,
      enable_live_chat:
        reconstructedConfig.feature_toggles?.enable_live_chat ?? true,
      allow_bulk_product_import:
        reconstructedConfig.feature_toggles?.allow_bulk_product_import ?? true,
    },
    created_at: toISOStringSafe(
      (finalConfigs.find((c) => c.key === "created_at")?.created_at ??
        new Date()) as Date,
    ),
    updated_at:
      finalConfigs.length > 0
        ? toISOStringSafe(finalConfigs[finalConfigs.length - 1].updated_at)
        : toISOStringSafe(new Date()),
  };
}
