import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IMallPlatformCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "returned email should match submitted email",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "customer id should be present",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "customer status should be present",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "access token should be present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.equals(
    "join utility should set authorization header",
    customerConnection.headers?.Authorization,
    authorized.token.access,
  );
  if (authorized.profile !== undefined) {
    typia.assert(authorized.profile);
    TestValidator.equals(
      "profile should belong to the registered customer",
      authorized.profile.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "profile customer email should match the registered email",
      authorized.profile.customer.email,
      body.email,
    );
  }
}
