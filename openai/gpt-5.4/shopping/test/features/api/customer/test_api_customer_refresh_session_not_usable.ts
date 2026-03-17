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

export async function test_api_customer_refresh_session_not_usable(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: "Password123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  TestValidator.equals("joined email matches input", authorized.email, email);
  TestValidator.equals(
    "joined customer connection stores issued access token",
    customerConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.notEquals("refresh token exists", authorized.token.refresh, "");
  TestValidator.notEquals("access token exists", authorized.token.access, "");
  const invalidRefreshConnection: api.IConnection = { host: connection.host };
  const refreshInput = {
    refresh: `${authorized.token.refresh}-tampered-${RandomGenerator.alphabets(6)}`,
  } satisfies IShoppingMallCustomer.IRefresh;
  await TestValidator.error(
    "refresh is rejected for unusable session credential",
    async () => {
      await authorize_customer_refresh(invalidRefreshConnection, {
        body: refreshInput,
      });
    },
  );
  TestValidator.equals(
    "failed refresh does not implicitly authorize refresh-attempt connection",
    invalidRefreshConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "original customer session remains the originally issued authorization",
    customerConnection.headers?.Authorization,
    authorized.token.access,
  );
  TestValidator.equals(
    "authorized customer id remains stable in baseline state",
    authorized.id,
    authorized.id,
  );
  TestValidator.equals(
    "authorized customer email remains stable in baseline state",
    authorized.email,
    email,
  );
}
