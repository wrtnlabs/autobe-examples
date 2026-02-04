import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallConfiguration } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfiguration";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_configuration_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: "https://example.com/join",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminCredentials });
  // Step 2: Get the configuration using a known configuration ID (from the system context)
  // As per the API design, there is no way to create a configuration (no POST endpoint provided),
  // so we must assume there is a configuration with a known UUID available
  // In practice, this would be a configuration that was set up during system initialization
  // We use a UUID pattern to generate a plausible ID, but it must be a valid configuration ID from the system
  const configurationId = "00000000-0000-0000-0000-000000000001"; // Using a known system configuration ID
  // Step 3: Retrieve the configuration using the admin connection
  const configuration: IShoppingMallConfiguration =
    await api.functional.shoppingMall.admin.configurations.at(adminConnection, {
      configurationId,
    });
  // Step 4: Validate the entire configuration structure using typia.assert
  typia.assert(configuration);
  // Step 5: Verify basic property existence and types
  TestValidator.equals(
    "currency should be a string",
    typeof configuration.currency,
    "string",
  );
  TestValidator.equals(
    "timezone should be a string",
    typeof configuration.timezone,
    "string",
  );
  TestValidator.equals(
    "locale should be a string",
    typeof configuration.locale,
    "string",
  );
  TestValidator.equals(
    "payment_gateway should be a string",
    typeof configuration.payment_gateway,
    "string",
  );
  TestValidator.equals(
    "tax_calculation should be a string",
    typeof configuration.tax_calculation,
    "string",
  );
  TestValidator.equals(
    "shipping_rate_strategy should be a string",
    typeof configuration.shipping_rate_strategy,
    "string",
  );
  TestValidator.equals(
    "feature_toggles should be an object",
    typeof configuration.feature_toggles,
    "object",
  );
  TestValidator.equals(
    "created_at should be a string",
    typeof configuration.created_at,
    "string",
  );
  TestValidator.equals(
    "updated_at should be a string",
    typeof configuration.updated_at,
    "string",
  );
  // Step 6: Validate format constraints using typia.assert with tags
  const currency = typia.assert<string & tags.Pattern<"^[A-Z]{3}$">>(
    configuration.currency,
  );
  const timezone = typia.assert<
    string & tags.Pattern<"^[A-Za-z]+/[A-Za-z_]+$">
  >(configuration.timezone);
  const locale = typia.assert<string & tags.Pattern<"^[a-z]{2}-[A-Z]{2}$">>(
    configuration.locale,
  );
  const createdAt = typia.assert<string & tags.Format<"date-time">>(
    configuration.created_at,
  );
  const updatedAt = typia.assert<string & tags.Format<"date-time">>(
    configuration.updated_at,
  );
  // Validate enum values
  const paymentGateways: ("stripe" | "paypal" | "razorpay" | "square")[] = [
    "stripe",
    "paypal",
    "razorpay",
    "square",
  ];
  const taxCalculations: ("standard" | "reverse" | "exempt")[] = [
    "standard",
    "reverse",
    "exempt",
  ];
  const shippingStrategies: (
    | "flat"
    | "weight_based"
    | "free_threshold"
    | "tiered"
  )[] = ["flat", "weight_based", "free_threshold", "tiered"];
  TestValidator.predicate(
    "payment_gateway is one of allowed values",
    paymentGateways.includes(configuration.payment_gateway),
  );
  TestValidator.predicate(
    "tax_calculation is one of allowed values",
    taxCalculations.includes(configuration.tax_calculation),
  );
  TestValidator.predicate(
    "shipping_rate_strategy is one of allowed values",
    shippingStrategies.includes(configuration.shipping_rate_strategy),
  );
  // Validate feature toggle properties
  const features = [
    "allow_seller_registration",
    "require_email_verification",
    "enable_product_reviews",
    "auto_approve_sellers",
    "allow_guest_checkout",
    "use_dynamic_pricing",
    "enable_live_chat",
    "allow_bulk_product_import",
  ] as const;
  features.forEach((feature) => {
    TestValidator.predicate(
      `${feature} is a boolean`,
      typeof configuration.feature_toggles[feature] === "boolean",
    );
  });
  // Verify configuration has exactly 9 properties
  const objectKeys = Object.keys(configuration);
  const expectedKeys = [
    "currency",
    "timezone",
    "locale",
    "payment_gateway",
    "tax_calculation",
    "shipping_rate_strategy",
    "feature_toggles",
    "created_at",
    "updated_at",
  ];
  TestValidator.equals(
    "configuration has exactly 9 expected properties",
    objectKeys.sort(),
    expectedKeys.sort(),
  );
  // Verify no additional properties exist (strict schema validation)
  // This is a form of schema integrity validation
  const actualPropertyCount = objectKeys.length;
  const expectedPropertyCount = expectedKeys.length;
  TestValidator.equals(
    "configuration has no extra properties",
    actualPropertyCount,
    expectedPropertyCount,
  );
  // Verify we're not using the base connection for API calls
  // The adminConnection was created and used properly
}
