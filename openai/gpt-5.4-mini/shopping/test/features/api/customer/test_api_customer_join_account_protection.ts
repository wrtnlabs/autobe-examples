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

export async function test_api_customer_join_account_protection(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  TestValidator.equals(
    "customer email should match join input",
    authorized.email,
    email,
  );
  TestValidator.equals(
    "fresh customer account should be active",
    authorized.status,
    "active",
  );
  TestValidator.equals(
    "fresh customer account should not be deleted",
    authorized.deletedAt,
    null,
  );
  TestValidator.predicate(
    "customer id should be non-empty",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "customer createdAt should be non-empty",
    authorized.createdAt.length > 0,
  );
  TestValidator.predicate(
    "customer updatedAt should be non-empty",
    authorized.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "access token should be non-empty",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be non-empty",
    authorized.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration should be non-empty",
    authorized.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable-until timestamp should be non-empty",
    authorized.token.refreshable_until.length > 0,
  );
  TestValidator.predicate(
    "authorization response should not expose plaintext password",
    !Object.prototype.hasOwnProperty.call(authorized, "password"),
  );
  TestValidator.predicate(
    "authorization tokens should not equal the plaintext password",
    authorized.token.access !== password &&
      authorized.token.refresh !== password,
  );
}
