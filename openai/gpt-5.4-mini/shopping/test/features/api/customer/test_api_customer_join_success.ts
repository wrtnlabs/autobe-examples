import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IMallPlatformCustomer.IJoin;
  const output = await authorize_customer_join(customerConnection, {
    body,
  });
  typia.assert(output);
  TestValidator.equals(
    "customer email should match registration input",
    output.email,
    body.email,
  );
  TestValidator.predicate(
    "customer account should be active",
    output.status.length > 0,
  );
  TestValidator.equals(
    "new customer account should not be deleted",
    output.deletedAt,
    null,
  );
  TestValidator.predicate(
    "authorization access token should exist",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token should exist",
    output.token.refresh.length > 0,
  );
}
