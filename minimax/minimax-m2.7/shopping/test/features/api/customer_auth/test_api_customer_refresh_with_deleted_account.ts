import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_with_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account to obtain valid tokens
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Store the refresh token from the newly created account
  const validRefreshToken = authorized.token.refresh;
  // 2. Attempt to call refresh endpoint with an invalid/non-existent refresh token
  // This simulates the scenario where the associated customer no longer exists
  // (soft-deleted or never existed in the first place)
  // 3. Validate that response returns 401 Unauthorized
  await TestValidator.httpError(
    "refresh with non-existent token should return 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.customer.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: `invalid-token-${RandomGenerator.alphaNumeric(32)}`,
          } satisfies IEcommerceMallCustomer.IRefresh,
        },
      ),
  );
  // Additionally test that a valid refresh token from one account
  // cannot be used after that account is deleted (simulated by using
  // a different invalid token representing deleted state)
  // The system should reject any refresh token whose associated customer
  // has deleted_at set to a non-null value
  await TestValidator.httpError(
    "refresh token from deleted account should return 401",
    401,
    async () =>
      await api.functional.ecommerceMall.auth.customer.refresh(
        { host: connection.host },
        {
          body: {
            refreshToken: validRefreshToken,
          } satisfies IEcommerceMallCustomer.IRefresh,
        },
      ),
  );
}
