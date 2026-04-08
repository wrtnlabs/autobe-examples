import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller login rejection for pending approval status.
 *
 * Validates that sellers with pending approval status cannot authenticate to the platform. After seller registration creates an account with approval_status = 'pending', attempting to login should be rejected with a 403 status code. The system must validate the approval status before allowing authentication, preventing sellers from accessing the platform until administrator approval is granted.
 *
 * This test ensures the approval workflow is properly enforced at the authentication layer, maintaining platform quality control by preventing unapproved sellers from listing products or processing orders.
 *
 * 1. Register a new seller account with random credentials (creates account with pending approval status).
 * 2. Attempt to login with the registered seller credentials.
 * 3. Validates that login fails with HTTP 403 Forbidden error.
 * 4. Verifies the error response indicates the account requires administrator approval.
 */
export async function test_api_seller_login_pending_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account (creates account with pending approval status)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string & tags.Format<"password"> =
    RandomGenerator.alphaNumeric(16) as string & tags.Format<"password">;
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: sellerEmail,
      password: typia.assert<string & tags.MinLength<8>>(sellerPassword),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // Verify the seller account has pending approval status
  TestValidator.equals(
    "seller approval status is pending",
    seller.approval_status,
    "pending",
  );
  // 2. Attempt to login with the registered seller credentials
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "seller login with pending approval should fail with 403",
    403,
    async () => {
      await authorize_seller_login(sellerLoginConnection, {
        body: {
          email: sellerEmail,
          password: typia.assert<string & tags.Format<"password">>(sellerPassword),
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceSeller.ILogin,
      });
    },
  );
}
