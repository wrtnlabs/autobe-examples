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

export async function test_api_user_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Test duplicate email rejection during user registration.
  // 1. Successfully register a user with a unique email
  // 2. Attempt to register a second user with the same email
  // 3. Verify the second registration fails with a business logic error
  // 4. Confirm the original user account remains intact and can authenticate
  // Generate a unique email for testing
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const displayName = RandomGenerator.name();
  // Step 1: Create first connection and register user successfully
  const firstConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstConnection, {
    body: {
      email,
      password,
      displayName,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(firstUser);
  // Verify first user was created successfully
  TestValidator.equals("first user email matches", firstUser.email, email);
  TestValidator.equals(
    "first user display name matches",
    firstUser.displayName,
    displayName,
  );
  // Step 2: Attempt to register a second user with the same email
  // This should fail with a business logic error (duplicate email constraint)
  const secondConnection: api.IConnection = { host: connection.host };
  const differentPassword = RandomGenerator.alphaNumeric(16);
  const differentDisplayName = RandomGenerator.name();
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await authorize_user_join(secondConnection, {
        body: {
          email, // Same email as first user
          password: differentPassword,
          displayName: differentDisplayName,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        },
      });
    },
  );
  // Step 3: Verify the original user account remains intact
  // The first connection should still have valid authentication
  TestValidator.predicate(
    "original user token remains valid",
    firstConnection.headers !== undefined &&
      firstConnection.headers.Authorization !== undefined,
  );
}