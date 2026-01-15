import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallPaymentGatewayFailovers } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentGatewayFailovers";
export async function test_api_payment_gateway_failover_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Make the GET request to retrieve payment gateway failover analytics
  const failoverAnalytics: IShoppingMallPaymentGatewayFailovers.ISummary =
    await api.functional.shoppingMall.analytics.payment_gateway_failovers.index(
      connection,
    );
  // Validate that the response matches the expected schema structure
  typia.assert(failoverAnalytics);
}
