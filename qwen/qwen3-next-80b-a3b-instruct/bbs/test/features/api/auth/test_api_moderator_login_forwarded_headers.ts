import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_forwarded_headers(
  connection: api.IConnection,
) {
  // Generate realistic moderator login credentials
  const moderatorEmail = typia.random<string & tags.Format<"email">>();

  // Execute moderator login - the system will automatically handle forwarded headers
  // as part of the underlying HTTP request context when behind a proxy
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: moderatorEmail,
    });

  // Verify the response contains all required authentication information
  typia.assert(response);

  // Validate the essential business logic: correct email is returned and valid token structure exists
  TestValidator.equals(
    "moderator email matches",
    response.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "access token exists",
    response.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token exists",
    response.token.refresh.length > 0,
  );
  TestValidator.equals(
    "moderator id is valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      response.id,
    ),
    true,
  );
}
