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
 * Test user registration with duplicate display name validation.
 *
 * This test verifies that the system properly enforces display name uniqueness
 * by attempting to register a second user with the same display name as an
 * existing user. The test expects the system to reject the duplicate display
 * name with an appropriate error.
 */
export async function test_api_user_registration_with_display_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // Create first user with a specific display name
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: "TestUser123",
    },
  });
  typia.assert(firstUser);
  // Attempt to create second user with the same display name
  await TestValidator.error(
    "duplicate display name should be rejected",
    async () => {
      await api.functional.discussionBoard.auth.user.join(connection, {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          display_name: "TestUser123",
        } satisfies IDiscussionBoardUser.IJoin,
      });
    },
  );
}
