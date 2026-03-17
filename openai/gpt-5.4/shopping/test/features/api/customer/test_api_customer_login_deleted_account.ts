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

export async function test_api_customer_login_deleted_account(
  connection: api.IConnection,
): Promise<void> {
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const ip: string & tags.Format<"ipv4"> = typia.random<
    string & tags.Format<"ipv4">
  >();
  const joinConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joined);
  TestValidator.equals(
    "joined customer email matches input",
    joined.email,
    email,
  );
  TestValidator.equals("joined customer is active", joined.deleted_at, null);
  TestValidator.equals("joined customer is not banned", joined.banned_at, null);
  TestValidator.notEquals("access token exists", joined.token.access, "");
  TestValidator.notEquals("refresh token exists", joined.token.refresh, "");
  const duplicateJoinConnection: api.IConnection = { host: connection.host };
  await TestValidator.error(
    "duplicate join with same email is rejected",
    async () => {
      await authorize_customer_join(duplicateJoinConnection, {
        body: {
          email,
          password,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
          ip: typia.random<string & tags.Format<"ipv4">>(),
        } satisfies IShoppingMallCustomer.IJoin,
      });
    },
  );
  TestValidator.equals(
    "original authorized connection stores access token",
    joinConnection.headers?.Authorization,
    joined.token.access,
  );
}
