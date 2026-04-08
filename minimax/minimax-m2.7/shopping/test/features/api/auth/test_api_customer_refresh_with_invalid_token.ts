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

/**
 * Test that the refresh endpoint rejects requests with invalid refresh tokens.
 * This ensures the system properly rejects tampered or non-existent refresh tokens.
 *
 * Scenario:
 * 1. Create a valid customer account
 * 2. Attempt to refresh using a fabricated/invalid refresh token
 * 3. Validate 401 Unauthorized response
 */
export async function test_api_customer_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a valid customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  // 2. Use an invalid/fabricated refresh token
  const invalidToken = "invalid-fabricated-refresh-token-12345";
  // 3. Attempt refresh with invalid token - should return 401
  await TestValidator.httpError(
    "invalid refresh token should return 401",
    401,
    async () => {
      const refreshConnection: api.IConnection = { host: connection.host };
      await api.functional.ecommerceMall.auth.customer.refresh(
        refreshConnection,
        {
          body: {
            refreshToken: invalidToken,
          } satisfies IEcommerceMallCustomer.IRefresh,
        },
      );
    },
  );
}
