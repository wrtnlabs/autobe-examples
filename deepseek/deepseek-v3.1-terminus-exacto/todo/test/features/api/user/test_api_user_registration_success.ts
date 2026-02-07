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
 * Test successful user registration with valid email, password, and display name.
 * Verifies that the system creates a new user account, generates valid JWT tokens,
 * and returns complete user profile information including id, email, display_name,
 * timestamps, and authentication tokens.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // Generate random valid registration data
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.IJoin;
  // Register the user using the utility function
  const authorizedUser = await authorize_user_join(userConnection, {
    body: joinInput,
  });
  // Validate the complete response structure - typia.assert() validates ALL properties including formats
  typia.assert(authorizedUser);
  // Verify user profile information matches input (business logic validation)
  TestValidator.equals(
    "email matches input",
    authorizedUser.email,
    joinInput.email,
  );
  TestValidator.equals(
    "display name matches input",
    authorizedUser.display_name,
    joinInput.display_name,
  );
  // Validate timestamps are in correct order (business logic validation)
  TestValidator.predicate(
    "created_at <= updated_at",
    new Date(authorizedUser.created_at) <= new Date(authorizedUser.updated_at),
  );
}
