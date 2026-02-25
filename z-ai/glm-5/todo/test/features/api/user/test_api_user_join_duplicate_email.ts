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
 * Test duplicate email registration prevention.
 *
 * Validates that:
 * 1. First registration with an email succeeds
 * 2. Second registration with the same email fails
 * 3. The email uniqueness constraint is properly enforced
 */
export async function test_api_user_join_duplicate_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique email and password for testing
  const email = typia.random<string & tags.Format<"email">>() satisfies string as string;
  const password = RandomGenerator.alphaNumeric(16);
  // Step 1: First registration should succeed
  const firstUserConnection: api.IConnection = { host: connection.host };
  const firstUser = await authorize_user_join(firstUserConnection, {
    body: {
      email,
      password,
    },
  });
  typia.assert(firstUser);
  // Step 2: Second registration with same email should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      const secondUserConnection: api.IConnection = { host: connection.host };
      await authorize_user_join(secondUserConnection, {
        body: {
          email,
          password: RandomGenerator.alphaNumeric(16),
        },
      });
    },
  );
}
