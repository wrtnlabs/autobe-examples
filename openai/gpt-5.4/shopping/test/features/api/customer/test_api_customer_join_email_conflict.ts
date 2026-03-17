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

export async function test_api_customer_join_email_conflict(
  connection: api.IConnection,
): Promise<void> {
  const email = typia.random<string & tags.Format<"email">>();
  const firstConnection: api.IConnection = { host: connection.host };
  const firstJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/ref/${RandomGenerator.alphaNumeric(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  const firstCustomer = await authorize_customer_join(firstConnection, {
    body: firstJoinBody,
  });
  typia.assert(firstCustomer);
  typia.assert<IAuthorizationToken>(firstCustomer.token);
  const originalCustomerId = firstCustomer.id;
  TestValidator.equals(
    "registered email matches request",
    firstCustomer.email,
    email,
  );
  TestValidator.equals(
    "registered customer is active",
    firstCustomer.deleted_at,
    null,
  );
  TestValidator.equals(
    "registered customer is not banned",
    firstCustomer.banned_at,
    null,
  );
  TestValidator.predicate(
    "registered customer id exists",
    firstCustomer.id.length > 0,
  );
  TestValidator.predicate(
    "access token issued on successful join",
    firstCustomer.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token issued on successful join",
    firstCustomer.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "authorization header populated on successful join",
    typeof firstConnection.headers?.Authorization === "string" &&
      firstConnection.headers.Authorization.length > 0,
  );
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicateJoinBody = {
    email,
    password: RandomGenerator.alphaNumeric(16),
    href: `https://example.com/join/duplicate/${RandomGenerator.alphaNumeric(8)}`,
    referrer: `https://example.com/ref/duplicate/${RandomGenerator.alphaNumeric(8)}`,
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallCustomer.IJoin;
  await TestValidator.error(
    "duplicate customer email must be rejected",
    async () => {
      await authorize_customer_join(duplicateConnection, {
        body: duplicateJoinBody,
      });
    },
  );
  TestValidator.equals(
    "duplicate join does not issue authorization header",
    duplicateConnection.headers?.Authorization,
    undefined,
  );
  TestValidator.equals(
    "original customer email remains unchanged",
    firstCustomer.email,
    email,
  );
  TestValidator.equals(
    "original customer id remains unchanged",
    firstCustomer.id,
    originalCustomerId,
  );
  TestValidator.equals(
    "original customer remains not deleted",
    firstCustomer.deleted_at,
    null,
  );
  TestValidator.equals(
    "original customer remains not banned",
    firstCustomer.banned_at,
    null,
  );
}
