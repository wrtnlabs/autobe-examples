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
 * Retrieve an administrator account by identifier and verify the persisted governance record.
 *
 * Validates that an authenticated administrator can fetch an existing administrator account by UUID and receive the canonical account record. The response is checked for the expected identity and lifecycle fields only, ensuring the endpoint exposes the administrator profile data used for governance while keeping authentication secrets and session-related details out of the payload.
 *
 * 1. Authenticate a fresh administrator actor through the join utility.
 * 2. Retrieve the authenticated administrator account by UUID.
 * 3. Validate that the returned record matches the authenticated identity and contains the expected account fields.
 */
export async function test_api_administrator_account_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: `${RandomGenerator.alphabets(8)}@test.com` satisfies string,
        password: `${RandomGenerator.alphabets(12)}A1!` satisfies string,
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const administrator =
    await api.functional.mallPlatform.administrator.administrators.at(
      administratorConnection,
      {
        administratorId: authorized.id,
      },
    );
  typia.assert(administrator);
  TestValidator.equals("administrator id", administrator.id, authorized.id);
  TestValidator.equals(
    "administrator email",
    administrator.email,
    authorized.email,
  );
  TestValidator.equals(
    "administrator grade",
    administrator.grade,
    authorized.grade,
  );
  TestValidator.equals(
    "administrator status",
    administrator.status,
    authorized.status,
  );
  TestValidator.equals(
    "administrator createdAt",
    administrator.createdAt,
    authorized.createdAt,
  );
  TestValidator.equals(
    "administrator updatedAt",
    administrator.updatedAt,
    authorized.updatedAt,
  );
  TestValidator.equals(
    "administrator deletedAt",
    administrator.deletedAt,
    authorized.deletedAt,
  );
}
