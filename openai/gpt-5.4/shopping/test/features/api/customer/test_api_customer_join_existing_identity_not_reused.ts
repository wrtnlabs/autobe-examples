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

export async function test_api_customer_join_existing_identity_not_reused(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: firstBody,
  });
  typia.assert(firstCustomer);
  TestValidator.equals(
    "joined customer email matches request",
    firstCustomer.email,
    email,
  );
  TestValidator.equals(
    "newly joined customer is not banned",
    firstCustomer.banned_at,
    null,
  );
  TestValidator.equals(
    "newly joined customer is not deleted",
    firstCustomer.deleted_at,
    null,
  );
  const secondConnection: api.IConnection = { host: connection.host };
  const secondBody = {
    email,
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await TestValidator.error(
    "duplicate customer join must be rejected instead of reusing identity",
    async () => {
      await authorize_customer_join(secondConnection, {
        body: secondBody,
      });
    },
  );
}
