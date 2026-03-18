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

export async function test_api_customer_join_success(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/register",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const output = await authorize_customer_join(customerConnection, { body });
  typia.assert(output);
  TestValidator.equals(
    "customer email matches join request",
    output.email,
    body.email,
  );
  TestValidator.predicate("customer id is present", output.id.length > 0);
  TestValidator.equals("bannedAt should be null", output.bannedAt, null);
  TestValidator.equals("deletedAt should be null", output.deletedAt, null);
  TestValidator.predicate(
    "token access is usable",
    customerConnection.headers?.Authorization === output.token.access,
  );
  TestValidator.predicate(
    "token access is present",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is present",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is present",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "token refreshable_until is present",
    output.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "raw password is not exposed on response",
    !("password" in output),
  );
}
