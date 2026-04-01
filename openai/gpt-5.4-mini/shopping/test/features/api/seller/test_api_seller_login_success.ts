import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_login_success(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const joined = await authorize_seller_join(joinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformSeller.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("joined seller email", joined.email, email);
  TestValidator.equals(
    "joined seller rejection reason",
    joined.rejectionReason,
    null,
  );
  TestValidator.equals("joined seller deletedAt", joined.deletedAt, null);
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedIn = await authorize_seller_login(loginConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformSeller.ILogin,
  });
  typia.assert(loggedIn);
  TestValidator.equals("login seller id", loggedIn.id, joined.id);
  TestValidator.equals("login seller email", loggedIn.email, email);
  TestValidator.equals(
    "login seller rejection reason",
    loggedIn.rejectionReason,
    null,
  );
  TestValidator.equals("login seller deletedAt", loggedIn.deletedAt, null);
  TestValidator.predicate(
    "login should issue access token",
    loggedIn.token.access.length > 0,
  );
  TestValidator.predicate(
    "login should issue refresh token",
    loggedIn.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "login should issue access expiration",
    loggedIn.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "login should issue refreshable-until expiration",
    loggedIn.token.refreshable_until.length > 0,
  );
  const authorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: loggedIn.token.access,
    },
  };
  TestValidator.equals(
    "authorization header propagated",
    authorizedConnection.headers?.Authorization,
    loggedIn.token.access,
  );
}
