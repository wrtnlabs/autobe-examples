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

export async function test_api_customer_join_authorized_session(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `Pw${RandomGenerator.alphabets(10)}!1`,
    href: "https://example.com/signup",
    referrer: "https://example.com/landing",
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const authorized = await authorize_customer_join(customerConnection, {
    body,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "joined customer email should match request",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "authorized customer id should be present",
    authorized.id.length > 0,
  );
  TestValidator.equals(
    "customer bannedAt should be null after join",
    authorized.bannedAt,
    null,
  );
  TestValidator.equals(
    "customer deletedAt should be null after join",
    authorized.deletedAt,
    null,
  );
  TestValidator.predicate(
    "customer createdAt should not be empty",
    authorized.createdAt.length > 0,
  );
  TestValidator.predicate(
    "customer updatedAt should not be empty",
    authorized.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "authorization access token should be present",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "authorization refresh token should be present",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization expired_at should be present",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "authorization refreshable_until should be present",
    authorized.token.refreshable_until.length > 0,
  );
  if (authorized.profile !== null) {
    TestValidator.equals(
      "profile customer id should match authorized customer",
      authorized.profile.customer.id,
      authorized.id,
    );
    TestValidator.equals(
      "profile customer email should match authorized customer",
      authorized.profile.customer.email,
      authorized.email,
    );
  }
}
