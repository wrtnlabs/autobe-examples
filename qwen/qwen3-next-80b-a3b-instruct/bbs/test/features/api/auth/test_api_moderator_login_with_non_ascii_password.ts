import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_with_non_ascii_password(
  connection: api.IConnection,
) {
  // Generate non-ASCII password with emojis and accented characters as per scenario
  const nonAsciiPassword = "MójHasło123!🔒";
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Perform login with non-ASCII password - body is direct string because ILogin is string type
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: nonAsciiPassword,
    });

  // Validate response contains expected fields
  typia.assert(loginResponse);

  // Basic existence validation - we know typia.assert() validated everything
  TestValidator.predicate("moderator ID exists", loginResponse.id.length > 0);
  TestValidator.predicate(
    "moderator email exists",
    loginResponse.email.length > 0,
  );
  TestValidator.predicate(
    "access token exists",
    loginResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    loginResponse.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "expired_at exists",
    loginResponse.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshable_until exists",
    loginResponse.token.refreshable_until.length > 0,
  );
}
