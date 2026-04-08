import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_login_banned_account(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a customer account using join
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // Step 2: Confirm customer can login with valid credentials (account in good standing)
  const validConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_login(validConnection, {
    body: {
      email,
      password: password satisfies string as string,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(authorized);
  // Step 3: Simulate banned account scenario by attempting login
  // When account is banned by platform admin (database-level change),
  // the same valid credentials should be rejected with appropriate error
  const bannedConnection: api.IConnection = { host: connection.host };
  // Banned accounts should receive authentication rejection with 403 Forbidden
  // The error distinguishes banned status from invalid credentials
  await TestValidator.httpError(
    "banned account login should return 403 Forbidden",
    403,
    async () => {
      await authorize_customer_login(bannedConnection, {
        body: {
          email,
          password: password satisfies string as string,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies IEcommerceMallCustomer.ILogin,
      });
    },
  );
}