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

export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator registration success with authorization payload and account state.
   *
   * Confirms that a new administrator can join successfully, that the returned
   * authorized payload contains the expected identity and token metadata, and that
   * sensitive credential data is not exposed in the response. Also validates that
   * the created account is active and timestamps are populated as part of the
   * successful sign-up flow.
   *
   * 1. Create an isolated administrator connection.
   * 2. Submit a unique administrator join request.
   * 3. Validate the authorized response payload.
   * 4. Confirm account identity, status, timestamps, and token presence.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  const body = {
    email: typia.random<string & tags.Format<"email">>(),
    password: `${RandomGenerator.alphaNumeric(12)}A1!`,
  } satisfies IMallPlatformAdministrator.IJoin;
  const output = await authorize_administrator_join(administratorConnection, {
    body,
  });
  typia.assert(output);
  TestValidator.equals("administrator email", output.email, body.email);
  TestValidator.predicate(
    "administrator id is populated",
    output.id.length > 0,
  );
  TestValidator.predicate(
    "administrator grade is populated",
    output.grade.length > 0,
  );
  TestValidator.predicate(
    "administrator status is populated",
    output.status.length > 0,
  );
  TestValidator.predicate(
    "created timestamp is populated",
    output.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated timestamp is populated",
    output.updated_at.length > 0,
  );
  TestValidator.equals("deleted timestamp is null", output.deleted_at, null);
  TestValidator.predicate(
    "access token is populated",
    output.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is populated",
    output.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "access token expiration is populated",
    output.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable until is populated",
    output.token.refreshable_until.length > 0,
  );
}
