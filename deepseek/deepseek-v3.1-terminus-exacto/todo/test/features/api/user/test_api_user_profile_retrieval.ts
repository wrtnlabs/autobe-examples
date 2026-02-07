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
 * Test successful retrieval of authenticated user's profile information.
 *
 * This test verifies that the profile endpoint correctly returns complete user
 * information including email, display name, creation timestamp, and update
 * timestamp while excluding sensitive authentication data.
 */
export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new user account via join operation to establish authentication context
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(authorizedUser);
  // Retrieve the authenticated user's profile information
  const profile = await api.functional.todoApp.user.profile.at(userConnection);
  typia.assert(profile);
  // Validate that the profile data matches the registration input
  TestValidator.equals("user ID matches", profile.id, authorizedUser.id);
  TestValidator.equals("email matches", profile.email, authorizedUser.email);
  TestValidator.equals(
    "display name matches",
    profile.display_name,
    authorizedUser.display_name,
  );
  // Validate timestamp logical consistency (business logic validation)
  TestValidator.predicate(
    "updated_at is same as or after created_at",
    () => new Date(profile.updated_at) >= new Date(profile.created_at),
  );
}
