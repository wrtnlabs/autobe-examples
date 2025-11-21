import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_success_historical_record(
  connection: api.IConnection,
) {
  // Generate realistic moderator credentials with valid email and password
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  // Create login credentials that would represent a long-inactive moderator account
  const loginCredentials = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies ICommunityBBSModerator.ILogin;

  // Perform the moderator login operation
  const loginResponse: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginCredentials,
    });

  // Validate the response structure and types - typia.assert() handles all validation
  typia.assert(loginResponse);
}
