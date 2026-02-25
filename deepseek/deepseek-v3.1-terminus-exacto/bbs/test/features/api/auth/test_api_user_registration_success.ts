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
 * Verifies that the response contains correct user information and authentication tokens.
 */
export async function test_api_user_registration_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for user registration
  const userConnection: api.IConnection = { host: connection.host };
  // Register a new user using the utility function
  const result = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  // Validate the complete response structure using typia.assert
  typia.assert(result);
  // Verify that authentication tokens are properly generated
  TestValidator.predicate(
    "access token is generated",
    result.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is generated",
    result.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expiration dates are set",
    result.token.expired_at.length > 0 &&
      result.token.refreshable_until.length > 0,
  );
  // Verify user profile information is correctly returned
  TestValidator.predicate(
    "user has valid display name",
    result.display_name.length > 0,
  );
  TestValidator.predicate(
    "user has creation timestamp",
    result.created_at.length > 0,
  );
  TestValidator.predicate(
    "user has update timestamp",
    result.updated_at.length > 0,
  );
}
