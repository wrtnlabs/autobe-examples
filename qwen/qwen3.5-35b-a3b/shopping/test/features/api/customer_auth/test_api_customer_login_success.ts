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

export async function test_api_customer_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate customer registration credentials
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  // 2. Create customer account using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(adminConnection, {
    body: joinInput,
  });
  typia.assert(joinResult);
  // 3. Login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginInput = {
    email: joinInput.email,
    password: joinInput.password,
    href: joinInput.href,
    referrer: joinInput.referrer,
    ip: joinInput.ip,
  } satisfies IEcommerceMallCustomer.ILogin;
  const loginResult = await authorize_customer_login(loginConnection, {
    body: loginInput,
  });
  typia.assert(loginResult);
  // 4. Validate customer metadata fields
  TestValidator.equals("customer id is UUID", joinResult.id, loginResult.id);
  TestValidator.equals(
    "email matches input",
    joinResult.email,
    loginInput.email,
  );
  TestValidator.equals(
    "display_name exists",
    joinResult.display_name,
    loginResult.display_name,
  );
  TestValidator.equals(
    "phone_number matches",
    joinResult.phone_number,
    loginResult.phone_number,
  );
  TestValidator.equals("status matches", joinResult.status, loginResult.status);
  TestValidator.equals(
    "created_at exists",
    joinResult.created_at,
    loginResult.created_at,
  );
  TestValidator.equals(
    "updated_at exists",
    joinResult.updated_at,
    loginResult.updated_at,
  );
  TestValidator.equals(
    "deleted_at is null",
    joinResult.deleted_at,
    loginResult.deleted_at,
  );
  // 5. Validate authorization tokens
  TestValidator.predicate(
    "access token exists",
    loginResult.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResult.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at is valid date",
    !isNaN(Date.parse(loginResult.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is valid date",
    !isNaN(Date.parse(loginResult.token.refreshable_until)),
  );
  // 6. Validate token expiration timestamps are in the future
  TestValidator.predicate(
    "access expired_at is future",
    Date.parse(loginResult.token.expired_at) > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until is future",
    Date.parse(loginResult.token.refreshable_until) > Date.now(),
  );
}
