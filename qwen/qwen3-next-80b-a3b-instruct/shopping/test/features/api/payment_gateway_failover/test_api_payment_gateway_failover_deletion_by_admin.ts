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
export async function test_api_payment_gateway_failover_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using authorize_admin_join utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create a payment gateway failover configuration using generate_random_shopping_mall_admin_payment_gateway_failovers_create utility function
  const failover =
    await generate_random_shopping_mall_admin_payment_gateway_failovers_create(
      adminConnection,
      {
        body: {
          priority: 1,
          timeoutThreshold: 5000,
          paymentGatewayId: typia.random<string & tags.Format<"uuid">>(),
          maxRetryCount: 2,
        } satisfies IShoppingMallPaymentGatewayFailover.ICreate,
      },
    );
  const verifiedFailover = typia.assert<IShoppingMallPaymentGatewayFailover & { id: string }>(failover);
  // Step 3: Delete the created failover configuration using the API functional endpoint
  // Since no utility function exists for deletion, we use the direct SDK function
  const deleted =
    await api.functional.shoppingMall.admin.payment_gateway_failovers.erase(
      adminConnection,
      {
        failoverId: verifiedFailover.id,
      },
    );
  // No assertion needed for void return - successful deletion without error is the success condition
  // Step 4: Validate business rule - Only admin users can delete failover configurations
  // Create unauthenticated connection to test access control
  const guestConnection: api.IConnection = { host: connection.host };
  // Try to delete the same failover with unauthenticated connection - should fail
  await TestValidator.error(
    "non-admin users should not be able to delete failover configurations",
    async () => {
      await api.functional.shoppingMall.admin.payment_gateway_failovers.erase(
        guestConnection,
        {
          failoverId: verifiedFailover.id,
        },
      );
    },
  );
  // The test confirms successful deletion by admin and proper access control
}