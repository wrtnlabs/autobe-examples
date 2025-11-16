import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_configs_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin to obtain authorized connection
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.shoppingmall.example.com/onboarding",
    referrer: "https://shoppingmall.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed configuration entries with different namespaces and active flags
  const checkoutConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: {
        namespace: "checkout",
        key: "max_cart_items",
        value: "100",
        description: "Maximum number of items allowed in the shopping cart",
        active: true,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(checkoutConfig);

  const paymentTimeoutConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: {
        namespace: "payment",
        key: "payment_timeout_seconds",
        value: "300",
        description: "Timeout in seconds before a payment session expires",
        active: true,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(paymentTimeoutConfig);

  const paymentGatewayConfig: IShoppingMallConfig =
    await api.functional.shoppingMall.platformAdmin.configs.create(connection, {
      body: {
        namespace: "payment",
        key: "payment_gateway",
        value: "stripe",
        description: "Primary payment gateway identifier",
        active: false,
      } satisfies IShoppingMallConfig.ICreate,
    });
  typia.assert(paymentGatewayConfig);

  // 3. Search: filter active payment configs by keyPrefix and sort by key asc
  const activePaymentResponse: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        keyPrefix: "payment_",
        isActive: true,
        orderBy: "key",
        orderDirection: "asc",
      } satisfies IShoppingMallConfig.IRequest,
    });
  typia.assert(activePaymentResponse);

  const activePaymentData = activePaymentResponse.data;

  // Ensure only active payment configs with the given prefix are present
  for (const summary of activePaymentData) {
    TestValidator.predicate(
      "active payment search: keyPrefix filter must match",
      summary.key.startsWith("payment_"),
    );
    TestValidator.predicate(
      "active payment search: isActive must be true",
      summary.isActive === true,
    );
  }

  // Ensure our active paymentTimeoutConfig is included
  const hasTimeoutConfig = activePaymentData.some(
    (summary) =>
      summary.id === paymentTimeoutConfig.id &&
      summary.namespace === paymentTimeoutConfig.namespace &&
      summary.key === paymentTimeoutConfig.key,
  );
  TestValidator.predicate(
    "active payment search: should include payment_timeout_seconds config",
    hasTimeoutConfig,
  );

  // Ensure inactive paymentGatewayConfig is excluded
  const hasGatewayConfigInActive = activePaymentData.some(
    (summary) => summary.id === paymentGatewayConfig.id,
  );
  TestValidator.predicate(
    "active payment search: should not include inactive payment_gateway config",
    hasGatewayConfigInActive === false,
  );

  // Verify ascending key ordering
  for (let i = 1; i < activePaymentData.length; i++) {
    const prev = activePaymentData[i - 1];
    const curr = activePaymentData[i];
    TestValidator.predicate(
      "active payment search: keys must be sorted ascending",
      prev.key <= curr.key,
    );
  }

  // Basic pagination sanity checks
  const activePagination = activePaymentResponse.pagination;
  TestValidator.predicate(
    "active payment search: pagination.limit must be >= data length",
    activePagination.limit >= activePaymentData.length,
  );
  TestValidator.predicate(
    "active payment search: pagination.records must be >= data length",
    activePagination.records >= activePaymentData.length,
  );
  TestValidator.predicate(
    "active payment search: pagination.current must be >= 0",
    activePagination.current >= 0,
  );
  TestValidator.predicate(
    "active payment search: pagination.pages must be >= 0",
    activePagination.pages >= 0,
  );

  // 4. Search: filter inactive payment configs and verify toggled results
  const inactivePaymentResponse: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
        keyPrefix: "payment_",
        isActive: false,
        orderBy: "key",
        orderDirection: "asc",
      } satisfies IShoppingMallConfig.IRequest,
    });
  typia.assert(inactivePaymentResponse);

  const inactivePaymentData = inactivePaymentResponse.data;

  for (const summary of inactivePaymentData) {
    TestValidator.predicate(
      "inactive payment search: keyPrefix filter must match",
      summary.key.startsWith("payment_"),
    );
    TestValidator.predicate(
      "inactive payment search: isActive must be false",
      summary.isActive === false,
    );
  }

  // Ensure our inactive paymentGatewayConfig is included
  const hasGatewayConfig = inactivePaymentData.some(
    (summary) =>
      summary.id === paymentGatewayConfig.id &&
      summary.namespace === paymentGatewayConfig.namespace &&
      summary.key === paymentGatewayConfig.key,
  );
  TestValidator.predicate(
    "inactive payment search: should include payment_gateway config",
    hasGatewayConfig,
  );

  // Ensure active paymentTimeoutConfig is excluded
  const hasTimeoutConfigInInactive = inactivePaymentData.some(
    (summary) => summary.id === paymentTimeoutConfig.id,
  );
  TestValidator.predicate(
    "inactive payment search: should not include active payment_timeout_seconds config",
    hasTimeoutConfigInInactive === false,
  );

  // Verify ascending key ordering for inactive search
  for (let i = 1; i < inactivePaymentData.length; i++) {
    const prev = inactivePaymentData[i - 1];
    const curr = inactivePaymentData[i];
    TestValidator.predicate(
      "inactive payment search: keys must be sorted ascending",
      prev.key <= curr.key,
    );
  }

  // Pagination sanity checks for inactive search
  const inactivePagination = inactivePaymentResponse.pagination;
  TestValidator.predicate(
    "inactive payment search: pagination.limit must be >= data length",
    inactivePagination.limit >= inactivePaymentData.length,
  );
  TestValidator.predicate(
    "inactive payment search: pagination.records must be >= data length",
    inactivePagination.records >= inactivePaymentData.length,
  );
  TestValidator.predicate(
    "inactive payment search: pagination.current must be >= 0",
    inactivePagination.current >= 0,
  );
  TestValidator.predicate(
    "inactive payment search: pagination.pages must be >= 0",
    inactivePagination.pages >= 0,
  );
}
