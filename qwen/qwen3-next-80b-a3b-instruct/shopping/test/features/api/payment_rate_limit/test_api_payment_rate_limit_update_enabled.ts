import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentRateLimit";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_rate_limit_update_enabled(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
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
  // Step 2: Generate a random UUID for the rate limit ID
  // We must use a valid UUID format as required by the API endpoint
  const rateLimitId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Update the payment rate limit with all required fields
  const updatedRateLimit: IShoppingMallPaymentRateLimit =
    await api.functional.shoppingMall.admin.payment_rate_limits.update(
      adminConnection,
      {
        rateLimitId,
        body: {
          enabled: true, // Update enabled status
          limit: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(), // Required property
          period_sec: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<86400>
          >(), // Required property
          ip_type: "ip_address" as const, // Required property - one of "any" | "ip_address" | "ip_network"
        } satisfies IShoppingMallPaymentRateLimit.IUpdate,
      },
    );
  typia.assert(updatedRateLimit);
  // Step 4: Validate the update was successful
  TestValidator.equals(
    "rate limit enabled status was updated to true",
    updatedRateLimit.enabled,
    true,
  );
}
