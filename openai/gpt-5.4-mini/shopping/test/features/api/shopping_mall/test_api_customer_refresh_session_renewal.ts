import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refresh_session_renewal(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals("joined customer email", joined.email, email);
  TestValidator.equals(
    "joined customer id should be a uuid",
    joined.id,
    typia.assert<string & tags.Format<"uuid">>(joined.id),
  );
  const refreshed = await authorize_customer_refresh(customerConnection, {
    body: {
      refreshToken: joined.token.refresh,
    } satisfies IShoppingMallCustomer.IRefresh,
  });
  typia.assert(refreshed);
  TestValidator.equals("refreshed customer id", refreshed.id, joined.id);
  TestValidator.equals(
    "refreshed customer email",
    refreshed.email,
    joined.email,
  );
  TestValidator.equals(
    "refreshed account status",
    refreshed.accountStatus,
    joined.accountStatus,
  );
  TestValidator.equals(
    "refreshed bannedAt",
    refreshed.bannedAt,
    joined.bannedAt,
  );
  TestValidator.equals(
    "refreshed deletedAt",
    refreshed.deletedAt,
    joined.deletedAt,
  );
  TestValidator.equals(
    "refreshed createdAt",
    refreshed.createdAt,
    joined.createdAt,
  );
  TestValidator.equals("refreshed profile", refreshed.profile, joined.profile);
  TestValidator.predicate(
    "access token exists",
    refreshed.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    refreshed.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access expiration exists",
    refreshed.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until exists",
    refreshed.token.refreshable_until.length > 0,
  );
}
