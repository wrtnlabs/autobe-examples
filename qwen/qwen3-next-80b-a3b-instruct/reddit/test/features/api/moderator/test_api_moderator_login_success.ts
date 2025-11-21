import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBBSModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBBSModerator";

export async function test_api_moderator_login_success(
  connection: api.IConnection,
) {
  // Generate realistic moderator credentials
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword: string = "SecurePass123!";

  // Create moderator login request with valid credentials
  const moderatorLogin: ICommunityBBSModerator.ILogin = {
    email: moderatorEmail,
    password: moderatorPassword,
  } satisfies ICommunityBBSModerator.ILogin;

  // Execute moderator login
  const authResult: ICommunityBBSModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorLogin,
    });

  // Validate response structure and types - typia.assert() performs complete validation
  typia.assert(authResult);
}
