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
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_gateway_failover_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create an admin connection and authenticate via join
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
  // Step 2: Retrieve a payment gateway failover configuration by its ID
  // Use a predefined UUID since no generation function exists for failovers
  // Assumes test environment has at least one preconfigured failover
  const failoverId: string = "123e4567-e89b-12d3-a456-426614174000" as string &
    tags.Format<"uuid">;
  const failover: IShoppingMallPaymentGatewayFailover =
    await api.functional.shoppingMall.admin.payment_gateway_failovers.at(
      adminConnection, // Use adminConnection, NOT base connection
      {
        failoverId: failoverId,
      },
    );
  typia.assert(failover);
  // Step 3: Validate the failover configuration structure
  // Since IShoppingMallPaymentGatewayFailover is an empty object, typia.assert() validation is sufficient
  // No additional validation needed as the schema defines no properties
}
