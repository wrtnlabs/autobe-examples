import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieve_another_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account A
  const accountAConnection: api.IConnection = { host: connection.host };
  const accountA = await authorize_customer_join(accountAConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >() satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(accountA);
  // Generate a UUID for account A's session ID
  // Note: sessionId is not returned in join response, so we generate one for testing
  const accountASessionId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create customer account B
  const accountBConnection: api.IConnection = { host: connection.host };
  const accountBEmail = typia.random<
    string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
  >() satisfies string as string &
    tags.MinLength<1> &
    tags.MaxLength<255> &
    tags.Format<"email">;
  const accountBPassword = RandomGenerator.alphaNumeric(16);
  const accountB = await authorize_customer_join(accountBConnection, {
    body: {
      email: accountBEmail satisfies string as string &
        tags.MinLength<1> &
        tags.MaxLength<255> &
        tags.Format<"email">,
      password: accountBPassword,
      href: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      referrer: typia.random<
        string & tags.Format<"uri">
      >() satisfies string as string & tags.Format<"uri">,
      ip: typia.random<
        string & tags.Format<"ipv4">
      >() satisfies string as string & tags.Format<"ipv4">,
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(accountB);
  // 3. Login with customer B credentials to get authenticated connection
  const accountBLoginConnection: api.IConnection = { host: connection.host };
  const accountBLogin = await authorize_customer_login(
    accountBLoginConnection,
    {
      body: {
        email: accountBEmail,
        password: accountBPassword,
      } as IEcommerceMallCustomer.ILogin,
    },
  );
  typia.assert(accountBLogin);
  // 4. Attempt to retrieve customer A's session using customer B's connection
  // This should return 403 Forbidden since customer B cannot access customer A's session
  await TestValidator.httpError(
    "customer cannot retrieve another customer's session",
    403,
    async () => {
      await api.functional.ecommerceMall.customer.sessions.at(
        accountBLoginConnection,
        {
          sessionId: accountASessionId,
        },
      );
    },
  );
}
