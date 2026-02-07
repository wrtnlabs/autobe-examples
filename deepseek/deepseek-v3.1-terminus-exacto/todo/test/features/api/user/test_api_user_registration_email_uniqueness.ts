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
 * Test that the system prevents duplicate email registrations.
 * Attempt to register a user with an email that already exists in the system
 * and verify that the operation fails with appropriate error response.
 * This validates the email uniqueness constraint across all registered users,
 * ensuring data integrity and preventing account conflicts.
 */
export async function test_api_user_registration_email_uniqueness(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create initial user account
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(firstUser);
  // Step 2: Attempt to register another user with the same email
  const duplicateEmail = firstUser.email;
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const secondUserConnection: api.IConnection = { host: connection.host };
      await authorize_user_join(secondUserConnection, {
        body: {
          email: duplicateEmail,
          password: RandomGenerator.alphaNumeric(16),
          display_name: RandomGenerator.name(),
        } satisfies ITodoAppUser.IJoin,
      });
    },
  );
}
