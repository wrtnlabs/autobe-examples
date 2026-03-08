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

export async function test_api_customer_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register new customer account with valid credentials
  const customerConnection: api.IConnection = { host: connection.host };
  const inputEmail = typia.random<string & tags.Format<"email">>();
  const inputPassword = RandomGenerator.alphaNumeric(16);
  const inputHref = typia.random<string & tags.Format<"uri">>();
  const inputReferrer = typia.random<string & tags.Format<"uri">>();
  const joinResult = await authorize_customer_join(customerConnection, {
    body: {
      email: inputEmail,
      password: inputPassword,
      href: inputHref,
      referrer: inputReferrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Validate customer account business logic after registration
  TestValidator.equals(
    "customer account is not banned after registration",
    joinResult.isBanned,
    false,
  );
  TestValidator.equals(
    "ban reason is null when not banned",
    joinResult.banReason,
    null,
  );
  TestValidator.equals(
    "returned email matches input email",
    joinResult.email,
    inputEmail,
  );
  // 3. Verify token expiration logic (business logic, not type validation)
  const accessTokenExpire = new Date(joinResult.token.expired_at);
  const refreshDeadline = new Date(joinResult.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "expired_at is in the future",
    accessTokenExpire > now,
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    refreshDeadline > accessTokenExpire,
  );
  // 4. Verify customer can use tokens for authenticated requests
  const authenticatedConnection: api.IConnection = { host: connection.host };
  authenticatedConnection.headers = {
    Authorization: `Bearer ${joinResult.token.access}`,
  };
  typia.assertGuard(authenticatedConnection.headers);
}
