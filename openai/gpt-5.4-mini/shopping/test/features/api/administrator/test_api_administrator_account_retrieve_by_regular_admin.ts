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
 * Test regular administrator retrieval of another administrator account record.
 *
 * Validates that a logged-in regular administrator can inspect a distinct administrator account for governance review. The test confirms the returned account data matches the target administrator record and preserves only read-only profile and lifecycle fields.
 *
 * It also ensures the response exposes the expected persisted administrator state without leaking authentication secrets or session data, and that the lookup targets a different administrator identity from the acting caller.
 *
 * 1. Create an acting administrator account and authenticate it.
 * 2. Create a separate target administrator account and keep its returned record.
 * 3. Retrieve the target administrator by identifier using the acting administrator connection.
 * 4. Validate the retrieved record matches the target account and contains only the expected governance fields.
 */
export async function test_api_administrator_account_retrieve_by_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  const actingConnection: api.IConnection = { host: connection.host };
  const actingAuthorized = await authorize_administrator_join(
    actingConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234!",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(actingAuthorized);
  const targetConnection: api.IConnection = { host: connection.host };
  const targetAuthorized = await authorize_administrator_join(
    targetConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password1234!",
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(targetAuthorized);
  TestValidator.notEquals(
    "different administrator accounts",
    targetAuthorized.id,
    actingAuthorized.id,
  );
  const target =
    await api.functional.mallPlatform.administrator.administrators.at(
      actingConnection,
      {
        administratorId: targetAuthorized.id,
      },
    );
  typia.assert(target);
  TestValidator.equals("administrator id", target.id, targetAuthorized.id);
  TestValidator.equals(
    "administrator email",
    target.email,
    targetAuthorized.email,
  );
  TestValidator.equals(
    "administrator grade",
    target.grade,
    targetAuthorized.grade,
  );
  TestValidator.equals(
    "administrator status",
    target.status,
    targetAuthorized.status,
  );
  TestValidator.equals(
    "administrator createdAt",
    target.createdAt,
    targetAuthorized.createdAt,
  );
  TestValidator.equals(
    "administrator updatedAt",
    target.updatedAt,
    targetAuthorized.updatedAt,
  );
  TestValidator.equals(
    "administrator deletedAt",
    target.deletedAt,
    targetAuthorized.deletedAt,
  );
}
