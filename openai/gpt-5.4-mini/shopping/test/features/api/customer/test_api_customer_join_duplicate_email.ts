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

export async function test_api_customer_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  const firstConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!";
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const firstBody = {
    email,
    password,
    href,
    referrer,
    ip: "127.0.0.1",
  } satisfies IMallPlatformCustomer.IJoin;
  const firstAuthorized = await authorize_customer_join(firstConnection, {
    body: firstBody,
  });
  typia.assert(firstAuthorized);
  TestValidator.equals(
    "created customer email should match request",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "created customer deletion timestamp should be null",
    firstAuthorized.deleted_at,
    null,
  );
  TestValidator.predicate(
    "created customer should receive authorization token",
    firstAuthorized.token.access.length > 0 &&
      firstAuthorized.token.refresh.length > 0,
  );
  const duplicateConnection: api.IConnection = { host: connection.host };
  const duplicateBody = {
    email,
    password: "Password5678!",
    href: "https://example.com/register-again",
    referrer: "https://example.com/marketing",
    ip: "127.0.0.1",
  } satisfies IMallPlatformCustomer.IJoin;
  await TestValidator.error(
    "duplicate customer email should be rejected",
    async () => {
      await authorize_customer_join(duplicateConnection, {
        body: duplicateBody,
      });
    },
  );
  TestValidator.equals(
    "original customer email should remain unchanged",
    firstAuthorized.email,
    email,
  );
  TestValidator.equals(
    "original customer token should remain issued",
    firstAuthorized.token.access.length > 0,
    true,
  );
}
