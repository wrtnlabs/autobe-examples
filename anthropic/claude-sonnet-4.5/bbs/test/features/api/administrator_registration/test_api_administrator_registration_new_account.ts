import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";

/**
 * Test administrator registration with valid credentials.
 *
 * This test validates the complete administrator registration workflow by:
 *
 * 1. Generating valid registration credentials (username, email, password)
 * 2. Calling the administrator join API endpoint
 * 3. Verifying the response contains administrator ID and JWT tokens
 *
 * The registration process creates a new administrator account and returns
 * authorization tokens that enable authentication for administrative
 * operations.
 */
export async function test_api_administrator_registration_new_account(
  connection: api.IConnection,
) {
  const registrationData = {
    username: RandomGenerator.alphaNumeric(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<30>
      >(),
    ),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<8> & tags.Maximum<128>
      >(),
    ),
  } satisfies IDiscussionBoardAdministrator.ICreate;

  const authorized: IDiscussionBoardAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: registrationData,
    });

  typia.assert(authorized);
}
