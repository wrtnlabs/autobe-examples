import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test that an administrator can retrieve another administrator's details by ID.
 *
 * Validates the complete workflow of registering an administrator account and then fetching its profile via the GET endpoint. Ensures that the response contains the correct identity fields, lifecycle timestamps, and the computed grade field.
 *
 * Special attention is given to verifying that the grade is "regular" for a standard administrator account and that the deleted_at field is null for an active account.
 *
 * 1. Register a new administrator with randomized credentials via the join utility.
 * 2. Retrieve the administrator's profile by its UUID.
 * 3. Validate that the returned ID matches the path parameter, email matches registration input, grade is "regular", and deleted_at is null.
 */
export async function test_api_administrator_retrieve_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create admin-specific connection
  const adminConnection: api.IConnection = { host: connection.host };
  // 1. Register a new administrator
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  typia.assert(authorized);
  const administratorId = authorized.id;
  // 2. Retrieve the administrator by ID
  const administrator =
    await api.functional.eCommerceMall.administrator.administrators.at(
      adminConnection,
      {
        administratorId,
      },
    );
  typia.assert(administrator);
  // 3. Validate the retrieved administrator details
  TestValidator.equals(
    "administrator ID matches",
    administrator.id,
    administratorId,
  );
  TestValidator.equals("email matches", administrator.email, authorized.email);
  TestValidator.equals("grade is regular", administrator.grade, "regular");
  TestValidator.predicate(
    "deleted_at is null",
    administrator.deleted_at === null,
  );
}
