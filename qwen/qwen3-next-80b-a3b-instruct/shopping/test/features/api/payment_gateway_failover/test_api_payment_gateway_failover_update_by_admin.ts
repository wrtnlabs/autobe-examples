import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentGatewayFailover } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailover";
import type { IShoppingMallPaymentMethod } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethod";
import type { IShoppingMallPaymentMethodBillingInterval } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodBillingInterval";
import type { IShoppingMallPaymentMethodConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodConfig";
import type { IShoppingMallPaymentMethodCustomerIdRequirement } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodCustomerIdRequirement";
import type { IShoppingMallPaymentMethodSurchargeRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentMethodSurchargeRule";
import { prepare_random_shopping_mall_payment_method } from "../../../prepare/prepare_random_shopping_mall_payment_method";
import { prepare_random_shopping_mall_payment_gateway_failover } from "../../../prepare/prepare_random_shopping_mall_payment_gateway_failover";
import { generate_random_shopping_mall_admin_payment_methods_create } from "../../../generate/generate_random_shopping_mall_admin_payment_methods_create";
import { generate_random_shopping_mall_admin_payment_gateway_failovers_create } from "../../../generate/generate_random_shopping_mall_admin_payment_gateway_failovers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_gateway_failover_update_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate with join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create a payment method using the authenticated admin connection
  const paymentMethod: IShoppingMallPaymentMethod =
    await generate_random_shopping_mall_admin_payment_methods_create(
      adminConnection,
      {
        body: {
          gatewayId: RandomGenerator.alphaNumeric(10),
          supportedCurrencies: ["KRW"],
          enabledRegions: ["KR"],
          feePercentage: 2.99,
          feeFixedAmount: 0.3,
          requires3DSecure: true,
          maxAmount: 1000000,
          minAmount: 0.01,
          experimental: false,
          onboardingUrl: "https://example.com/onboard",
          businessClassification: "5977",
          autoRefundEnabled: true,
          settlementDays: 2,
          primaryForRegion: true,
          refundUrl: "https://example.com/refund-policy",
          supportsPartialCapture: true,
          authExpiryHours: 168,
          supportsRecurring: false,
          intervalBillingSupport: "monthly",
          customerIdRequirement: "required",
          marketingDescription: "Pay with secure gateway",
          documentationUrl: "https://example.com/docs",
        } satisfies IShoppingMallPaymentMethod.ICreate,
      },
    );
  typia.assert(paymentMethod);
  // Step 3: Create a failover configuration using the authenticated admin connection
  const failoverUnvalidated: IShoppingMallPaymentGatewayFailover =
    await generate_random_shopping_mall_admin_payment_gateway_failovers_create(
      adminConnection,
      {
        body: {
          priority: 1,
          timeoutThreshold: 5000,
          paymentGatewayId: paymentMethod.gateway_id,
          maxRetryCount: 2,
        } satisfies IShoppingMallPaymentGatewayFailover.ICreate,
      },
    );
  typia.assert(failoverUnvalidated);
  // Correctly use typia.assert to get the runtime shape including 'id'
  const failover = typia.assert<IShoppingMallPaymentGatewayFailover & { id: string }>(failoverUnvalidated);
  // Step 4: Update the failover configuration with new settings
  const updatedFailover: IShoppingMallPaymentGatewayFailover =
    await api.functional.shoppingMall.admin.payment_gateway_failovers.update(
      adminConnection,
      {
        failoverId: failover.id,
        body: {
          status: "active",
          priority: 5,
          gateway_id: paymentMethod.gateway_id,
          max_retries: 3,
          timeout_ms: 7000,
          retry_delay_seconds: 5,
        } satisfies IShoppingMallPaymentGatewayFailover.IUpdate,
      },
    );
  typia.assert(updatedFailover);
  // Step 5: Validate the updated failover configuration
  const validatedFailover = typia.assert<IShoppingMallPaymentGatewayFailover & {
    id: string;
    status: string;
    priority: number;
    gateway_id: string;
    max_retries: number;
    timeout_ms: number;
    retry_delay_seconds: number;
  }>(updatedFailover);
  TestValidator.equals(
    "failover status updated",
    validatedFailover.status,
    "active",
  );
  TestValidator.equals(
    "failover priority updated",
    validatedFailover.priority,
    5,
  );
  TestValidator.equals(
    "failover gateway_id updated",
    validatedFailover.gateway_id,
    paymentMethod.gateway_id,
  );
  TestValidator.equals(
    "failover max_retries updated",
    validatedFailover.max_retries,
    3,
  );
  TestValidator.equals(
    "failover timeout_ms updated",
    validatedFailover.timeout_ms,
    7000,
  );
  TestValidator.equals(
    "failover retry_delay_seconds updated",
    validatedFailover.retry_delay_seconds,
    5,
  );
}