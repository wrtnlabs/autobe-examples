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

export async function test_api_seller_login_approved_account(
  connection: api.IConnection,
): Promise<void> {
  // Generate valid credentials for seller registration
  const password = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();
  // 1. Register a new seller account (creates seller with 'pending' status initially)
  const joinConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    joinConnection,
    {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Login with the same seller credentials
  // The test environment automatically approves registered sellers
  const loginConnection: api.IConnection = { host: connection.host };
  const authenticated = await api.functional.ecommerceMall.auth.seller.login(
    loginConnection,
    {
      body: {
        email: email,
        password: password,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IEcommerceMallSeller.ILogin,
    },
  );
  typia.assert(authenticated);
  // 3. Validate response structure
  // Verify approval status is 'approved' (test environment auto-approves)
  TestValidator.equals(
    "approval_status is approved",
    authenticated.approval_status,
    "approved",
  );
  // Verify token structure
  TestValidator.predicate(
    "has valid access token",
    authenticated.token.access.length > 0,
  );
  TestValidator.predicate(
    "has valid refresh token",
    authenticated.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "has expired_at timestamp",
    authenticated.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "has refreshable_until timestamp",
    authenticated.token.refreshable_until.length > 0,
  );
  // Verify seller info
  TestValidator.equals("email matches", authenticated.email, email);
  TestValidator.predicate(
    "has valid seller id",
    /^[0-9a-f-]{36}$/i.test(authenticated.id),
  );
}
