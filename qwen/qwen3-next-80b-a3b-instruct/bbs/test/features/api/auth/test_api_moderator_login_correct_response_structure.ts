import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_correct_response_structure(
  connection: api.IConnection,
) {
  // Generate valid moderator login credentials using typia.random for proper type safety
  const loginData: IPoliticalForumModerator.ILogin =
    typia.random<IPoliticalForumModerator.ILogin>();

  // Perform moderator login
  const response: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: loginData,
    });

  // Complete and perfect type validation - typia.assert() validates EVERYTHING
  // - id is valid UUID
  // - email is valid email format
  // - token object exists
  // - token.access is string
  // - token.refresh is string
  // - token.expired_at is date-time format
  // - token.refreshable_until is date-time format
  // - All nested properties and structure
  typia.assert(response);
}
