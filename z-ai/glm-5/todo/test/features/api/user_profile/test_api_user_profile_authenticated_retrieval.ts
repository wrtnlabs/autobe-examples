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
 * Test authenticated user profile retrieval.
 *
 * This test validates that an authenticated user can successfully
 * retrieve their profile information. The test follows these steps:
 * 1. Register a new user account with valid credentials
 * 2. Call the profile endpoint with authenticated connection
 * 3. Validate the response contains a valid ITodoAppUser object
 * 4. Verify display_name is present and non-empty (1-50 characters, not whitespace-only)
 */
export async function test_api_user_profile_authenticated_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a user-specific connection and register
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userConnection, {});
  typia.assert(authorized);
  // 2. Retrieve the user's profile using the authenticated connection
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  // 3. Validate profile response - display_name must be non-empty (already validated by typia.assert for 1-50 chars)
  TestValidator.predicate(
    "display_name is not whitespace-only",
    profile.display_name.trim().length > 0,
  );
}
