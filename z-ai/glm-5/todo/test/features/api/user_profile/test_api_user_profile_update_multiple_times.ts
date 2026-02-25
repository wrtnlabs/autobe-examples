import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test multiple sequential display name updates to verify the system allows
 * unlimited changes without restrictions. First update the display name to an
 * initial custom value, then update it again to a different value. Verify that:
 * (1) both update requests succeed, (2) the final GET profile returns the most
 * recently set display name, (3) no error occurs from updating multiple times.
 * This validates the business requirement that display names can be changed
 * any number of times.
 */
export async function test_api_user_profile_update_multiple_times(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const userConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_user_join(userConnection, {});
  typia.assert(authResult);
  // 2. First update: set initial display name
  const firstName = RandomGenerator.name();
  const firstUpdate = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: { display_name: firstName } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(firstUpdate);
  TestValidator.equals(
    "first update succeeds",
    firstUpdate.display_name,
    firstName,
  );
  // 3. Second update: change to a different display name
  const secondName = RandomGenerator.name();
  const secondUpdate = await api.functional.todoApp.user.profile.update(
    userConnection,
    {
      body: { display_name: secondName } satisfies ITodoAppUser.IUpdate,
    },
  );
  typia.assert(secondUpdate);
  TestValidator.equals(
    "second update succeeds",
    secondUpdate.display_name,
    secondName,
  );
  // 4. Verify the final display name is the most recently set value
  TestValidator.notEquals("display names are different", firstName, secondName);
  TestValidator.equals(
    "final display name is second value",
    secondUpdate.display_name,
    secondName,
  );
}
