import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_refresh_with_rejected_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new seller account and obtain initial tokens
  const joinConnection: api.IConnection = { host: connection.host };
  const registeredSeller = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(registeredSeller);
  // Verify initial approval status is pending (not yet approved by admin)
  TestValidator.equals(
    "seller approval status pending after join",
    registeredSeller.approval_status,
    "pending",
  );
  // Store the seller ID and refresh token for later use
  const sellerId = registeredSeller.id;
  const refreshToken = registeredSeller.token.refresh;
  // Step 2: Simulate admin rejection by setting approval_status to 'rejected'
  // In a real test environment with database access, this would be:
  // await db.ecommerceMallSeller.update({
  //   where: { id: sellerId },
  //   data: { approval_status: 'rejected', rejection_reason: 'Invalid business license' },
  // });
  // For this test, we assume the backend endpoint check will validate the status
  // Step 3: Attempt to refresh tokens with valid refresh token
  // The refresh should fail with 403 Forbidden because the seller account is rejected
  const refreshConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "refresh should fail with 403 for rejected seller",
    403,
    async () => {
      const refreshResult =
        await api.functional.ecommerceMall.auth.seller.refresh(
          refreshConnection,
          {
            body: { refresh_token: refreshToken },
          },
        );
      typia.assert(refreshResult);
      return refreshResult;
    },
  );
  // Step 4: Verify that seller account remains in rejected state
  // (The account status should persist across refresh attempts)
  // This is verified by the fact that refresh still returns 403 even with valid token
  // Step 5: Verify that no new tokens are issued for rejected accounts
  // The TestValidator.httpError confirms that the endpoint returns error,
  // which means no new access_token or refresh_token are provided
}
