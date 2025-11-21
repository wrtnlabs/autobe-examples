import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_success_different_client(
  connection: api.IConnection,
) {
  // Generate realistic moderator credentials
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Create moderator login credentials with valid format
  const loginCredentials = {
    email,
    password,
  } satisfies ICommunityBBSModerator.ILogin;

  // Perform moderator login
  const loginResponse: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });

  // Validate the response structure and type - typia.assert() performs complete validation
  typia.assert(loginResponse);
}
