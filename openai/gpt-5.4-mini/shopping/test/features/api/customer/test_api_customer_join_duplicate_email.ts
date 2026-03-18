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

export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const firstJoinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!";
  const firstAuthorized = await authorize_customer_join(firstJoinConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(firstAuthorized);
  const duplicateConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate customer email should be rejected",
    async () => {
      await authorize_customer_join(duplicateConnection, {
        body: {
          email,
          password: "DifferentPassword1234!",
          href: "https://example.com/register",
          referrer: "https://example.com/landing",
          ip: "127.0.0.1",
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original customer email remains unchanged",
    firstAuthorized.email,
    email,
  );
  TestValidator.predicate(
    "original authorization token exists",
    firstAuthorized.token.access.length > 0 &&
      firstAuthorized.token.refresh.length > 0,
  );
}
