import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSystemConfig";

/**
 * Test the creation of system configurations across all supported category
 * classifications.
 *
 * This test validates that the platform supports comprehensive configuration
 * management across all seven functional categories: payment, shipping, email,
 * platform, commission, features, and security. Each category receives a
 * representative configuration entry to ensure proper categorization,
 * filtering, and organizational grouping capabilities.
 *
 * Test Flow:
 *
 * 1. Authenticate as administrator with system configuration permissions
 * 2. Create configuration for payment category (payment gateway settings)
 * 3. Create configuration for shipping category (delivery logistics)
 * 4. Create configuration for email category (email service settings)
 * 5. Create configuration for platform category (general platform behavior)
 * 6. Create configuration for commission category (fee and commission rates)
 * 7. Create configuration for features category (feature flags and toggles)
 * 8. Create configuration for security category (authentication settings)
 * 9. Validate all configurations are properly created and categorized
 */
export async function test_api_system_config_creation_across_all_categories(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create payment category configuration
  const paymentConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "payment_gateway_mode",
        config_value: "production",
        value_type: "string",
        description:
          "Payment gateway operational mode. Valid values: 'sandbox' for testing, 'production' for live transactions. Affects which payment API endpoints are used.",
        category: "payment",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(paymentConfig);
  TestValidator.equals(
    "payment config category",
    paymentConfig.category,
    "payment",
  );

  // Step 3: Create shipping category configuration
  const shippingConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "free_shipping_threshold",
        config_value: "50.00",
        value_type: "decimal",
        description:
          "Minimum order amount in USD to qualify for free shipping. Orders below this amount will incur standard shipping fees.",
        category: "shipping",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(shippingConfig);
  TestValidator.equals(
    "shipping config category",
    shippingConfig.category,
    "shipping",
  );

  // Step 4: Create email category configuration
  const emailConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "email_smtp_host",
        config_value: "smtp.mailservice.com",
        value_type: "string",
        description:
          "SMTP server hostname for outbound email delivery. Used for transactional emails, notifications, and marketing communications.",
        category: "email",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(emailConfig);
  TestValidator.equals("email config category", emailConfig.category, "email");

  // Step 5: Create platform category configuration
  const platformConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "platform_name",
        config_value: "ShopHub Marketplace",
        value_type: "string",
        description:
          "Display name of the e-commerce platform shown in headers, emails, and public-facing content.",
        category: "platform",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(platformConfig);
  TestValidator.equals(
    "platform config category",
    platformConfig.category,
    "platform",
  );

  // Step 6: Create commission category configuration
  const commissionConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "default_commission_rate",
        config_value: "15.5",
        value_type: "decimal",
        description:
          "Default commission percentage charged to sellers per transaction. Applied when no custom rate is negotiated. Format: percentage as decimal (15.5 = 15.5%).",
        category: "commission",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(commissionConfig);
  TestValidator.equals(
    "commission config category",
    commissionConfig.category,
    "commission",
  );

  // Step 7: Create features category configuration
  const featuresConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "enable_product_reviews",
        config_value: "true",
        value_type: "boolean",
        description:
          "Feature flag to enable or disable customer product reviews. When enabled, customers can submit ratings and reviews after purchase.",
        category: "features",
        status: "active",
        is_sensitive: false,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(featuresConfig);
  TestValidator.equals(
    "features config category",
    featuresConfig.category,
    "features",
  );

  // Step 8: Create security category configuration
  const securityConfig =
    await api.functional.shoppingMall.admin.systemConfigs.create(connection, {
      body: {
        config_key: "jwt_secret_key",
        config_value: RandomGenerator.alphaNumeric(32),
        value_type: "string",
        description:
          "Secret key for JWT token signing and verification. Critical security component - must be kept confidential and rotated periodically.",
        category: "security",
        status: "active",
        is_sensitive: true,
      } satisfies IShoppingMallSystemConfig.ICreate,
    });
  typia.assert(securityConfig);
  TestValidator.equals(
    "security config category",
    securityConfig.category,
    "security",
  );

  // Step 9: Validate all configurations have proper status
  const allConfigs = [
    paymentConfig,
    shippingConfig,
    emailConfig,
    platformConfig,
    commissionConfig,
    featuresConfig,
    securityConfig,
  ];

  for (const config of allConfigs) {
    TestValidator.equals(
      "configuration status is active",
      config.status,
      "active",
    );
  }
}
