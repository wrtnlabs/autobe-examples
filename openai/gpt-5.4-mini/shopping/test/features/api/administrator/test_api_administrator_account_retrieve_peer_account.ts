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
 * Retrieve another administrator account and verify the public administrator profile schema.
 *
 * This test registers an administrator caller, then requests a different administrator record by UUID to confirm that peer-account inspection is allowed for authenticated administrators.
 *
 * The validation focuses on identity separation and public-field exposure: the response must describe the target administrator rather than the caller, and it must remain limited to the public administrator record fields without exposing authorization tokens or credential/workflow data.
 *
 * 1. Register an administrator caller through the administrator join utility.
 * 2. Generate a different administrator UUID for the peer account lookup.
 * 3. Retrieve the peer administrator account using the protected detail endpoint.
 * 4. Validate the returned account matches the requested target and only exposes the public schema fields.
 */
export async function test_api_administrator_account_retrieve_peer_account(
  connection: api.IConnection,
): Promise<void> {
  const callerConnection: api.IConnection = { host: connection.host };
  const caller = await authorize_administrator_join(callerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssw0rd1234" satisfies string,
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  typia.assert(caller);
  const targetAdministratorId = typia.random<string & tags.Format<"uuid">>();
  const targetAdministrator: IMallPlatformAdministrator =
    await api.functional.mallPlatform.administrator.administrators.at(
      callerConnection,
      {
        administratorId: targetAdministratorId,
      },
    );
  typia.assert(targetAdministrator);
  TestValidator.equals(
    "returns the requested administrator id",
    targetAdministrator.id,
    targetAdministratorId,
  );
  TestValidator.notEquals(
    "does not return the caller account",
    targetAdministrator.id,
    caller.id,
  );
  TestValidator.equals(
    "contains only the public administrator fields",
    Object.keys(targetAdministrator).sort(),
    [
      "created_at",
      "deleted_at",
      "email",
      "grade",
      "id",
      "status",
      "updated_at",
    ],
  );
}
