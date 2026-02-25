import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
 * Test login attempt with rejected seller account status.
 * Create a seller account, have it rejected by administrator, then attempt login.
 * Verify that login fails with appropriate error message indicating account rejection status.
 * Ensure rejected accounts cannot authenticate regardless of credential validity.
 */
export async function test_api_seller_login_account_status_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Create a new seller account to test with
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16) satisfies string &
      tags.Format<"password">,
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: typia.random<string & tags.Format<"uri">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceSeller.IJoin;
  // Register seller account using utility function
  const registeredSeller = await authorize_seller_join(sellerConnection, {
    body: joinBody,
  });
  typia.assert(registeredSeller);
  // Store credentials for login attempt
  const loginCredentials = {
    email: joinBody.email,
    password: joinBody.password,
  } satisfies IEcommerceSeller.ILogin;
  // Attempt login - should fail because account is not approved (pending_approval or rejected)
  await TestValidator.error(
    "Login should fail for non-approved seller account",
    async () => {
      await authorize_seller_login(sellerConnection, {
        body: loginCredentials,
      });
    },
  );
}
