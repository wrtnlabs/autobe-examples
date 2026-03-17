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

export async function test_api_seller_login_pending_can_authenticate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a seller account with pending approval status
  const joinConnection: api.IConnection = { host: connection.host };
  const joinPassword = RandomGenerator.alphaNumeric(16);
  const seller = await authorize_seller_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: joinPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Attempt to login with pending seller's credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const authenticatedSeller = await authorize_seller_login(loginConnection, {
    body: {
      email: seller.email,
      password: joinPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  typia.assert(authenticatedSeller);
  typia.assert(authenticatedSeller.token);
  // 3. Verify authentication is successful
  // Validate that pending sellers can authenticate and receive valid tokens
  TestValidator.equals(
    "email matches",
    authenticatedSeller.email,
    seller.email,
  );
  TestValidator.equals("seller ID matches", authenticatedSeller.id, seller.id);
  // 4. Validate token has valid JWT tokens and timestamps
  // (typia.assert on IAuthorizationToken already validates the structure,
  // but we can validate business logic with TestValidator)
  TestValidator.predicate(
    "access token exists",
    authenticatedSeller.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    authenticatedSeller.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date-time",
    authenticatedSeller.token.expired_at !== "",
  );
  TestValidator.predicate(
    "refreshable_until is valid date-time",
    authenticatedSeller.token.refreshable_until !== "",
  );
}
