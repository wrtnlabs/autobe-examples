import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_authorized_registration(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const body = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const output: IShoppingMallCustomer.IAuthorized = typia.assert(
    await authorize_customer_join(customerConnection, {
      body,
    }),
  );
  TestValidator.equals(
    "registered email is preserved",
    output.email,
    body.email,
  );
  TestValidator.equals("new customer is not banned", output.banned_at, null);
  TestValidator.equals("new customer is not deleted", output.deleted_at, null);
  TestValidator.predicate(
    "access token exists",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    output.token.refresh.length > 0,
  );
  TestValidator.equals(
    "customer connection becomes immediately authenticated",
    customerConnection.headers?.Authorization,
    output.token.access,
  );
  TestValidator.predicate(
    "access token expires no later than refreshable session deadline",
    new Date(output.token.expired_at).getTime() <=
      new Date(output.token.refreshable_until).getTime(),
  );
}
