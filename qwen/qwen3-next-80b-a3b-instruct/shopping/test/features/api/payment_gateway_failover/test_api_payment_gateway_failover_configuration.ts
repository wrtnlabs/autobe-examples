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
import { prepare_random_shopping_mall_payment_gateway_failover } from "../../../prepare/prepare_random_shopping_mall_payment_gateway_failover";
import { generate_random_shopping_mall_admin_payment_gateway_failovers_create } from "../../../generate/generate_random_shopping_mall_admin_payment_gateway_failovers_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_payment_gateway_failover_configuration(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@wrtn.io",
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join-" + RandomGenerator.alphaNumeric(6),
      referrer:
        "https://example.com/admin/signup-" + RandomGenerator.alphaNumeric(6),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminResult);
  
  // Step 2: Generate a realistic payment gateway ID
  const paymentGatewayId = typia.random<string & tags.Format<"uuid">>();
  
  // Step 3: Create payment gateway failover configuration
  const failover =
    await generate_random_shopping_mall_admin_payment_gateway_failovers_create(
      adminConnection,
      {
        body: {
          priority: 1,
          timeoutThreshold: 5000,
          paymentGatewayId: paymentGatewayId,
          maxRetryCount: 2,
        } satisfies IShoppingMallPaymentGatewayFailover.ICreate,
      },
    );
  typia.assert(failover);
  
  // Step 4: Validate the created failover entity
  // Assuming the interface returns a DTO with the properties in question
  // If structure is nested under a property, adjust access accordingly
  const failoverEntity = failover as unknown as {
    priority: number;
    timeoutThreshold: number;
    paymentGatewayId: string;
    maxRetryCount: number;
    createdAt: string;
    updatedAt: string;
  };
  
  TestValidator.equals("priority is 1", failoverEntity.priority, 1);
  TestValidator.equals(
    "timeoutThreshold is 5000",
    failoverEntity.timeoutThreshold,
    5000,
  );
  TestValidator.equals(
    "paymentGatewayId matches",
    failoverEntity.paymentGatewayId,
    paymentGatewayId,
  );
  TestValidator.equals("maxRetryCount is 2", failoverEntity.maxRetryCount, 2);
  
  // Fix predicate: pass a function with no arguments to TestValidator.predicate
  TestValidator.predicate("createdAt is valid date-time", () => {
    const isoDate = new Date(failoverEntity.createdAt);
    return !isNaN(isoDate.getTime());
  });
  
  TestValidator.predicate("updatedAt is valid date-time", () => {
    const isoDate = new Date(failoverEntity.updatedAt);
    return !isNaN(isoDate.getTime());
  });
}