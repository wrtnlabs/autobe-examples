import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Validates that the system creates a new user account, generates proper JWT tokens
 * with expiration timestamps, and returns complete user profile information.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection object for the user actor
  const userConnection: api.IConnection = { host: connection.host };
  // Use the utility function to register a new user
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: null,
    } satisfies IDiscussionBoardUser.IJoin,
  });
  // Perform complete runtime validation of the response
  // typia.assert() validates EVERYTHING: property existence, types, formats, constraints
  typia.assert(authorizedUser);
}
