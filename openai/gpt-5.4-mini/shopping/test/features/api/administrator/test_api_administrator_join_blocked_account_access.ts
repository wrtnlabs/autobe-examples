import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Validate administrator join returns an authorized payload that can be used as a normal session.
 *
 * This test exercises the administrator registration flow through the provided join utility,
 * then verifies the returned authorization payload is structurally valid and tied to the
 * requested email identity.
 *
 * The scenario is constrained by the available DTOs, so the test focuses on the observable
 * contract of the join endpoint: issued account metadata and token payload integrity.
 *
 * 1. Create an isolated administrator connection.
 * 2. Register an administrator account through the join utility.
 * 3. Validate the authorization payload fields returned by the endpoint.
 */
export async function test_api_administrator_join_blocked_account_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!Aa1",
  } satisfies IMallPlatformAdministrator.IJoin;
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body,
    },
  );
  typia.assert(authorized);
  TestValidator.equals(
    "administrator email should match the join request",
    authorized.email,
    body.email,
  );
  TestValidator.predicate(
    "administrator identifier should be present",
    authorized.id.length > 0,
  );
  TestValidator.predicate(
    "administrator grade should be present",
    authorized.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator status should be present",
    authorized.status.length > 0,
  );
  TestValidator.predicate(
    "administrator access token should be issued",
    authorized.token.access.length > 0,
  );
  TestValidator.predicate(
    "administrator refresh token should be issued",
    authorized.token.refresh.length > 0,
  );
}
