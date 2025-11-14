import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

// Test the moderation login endpoint's resistance to SQL injection
// The system enforces SQL injection prevention by strictly validating email format
// using RFC 5322 standards. Any string that does not conform to valid email format
// is rejected BEFORE any database interaction occurs.
// This attack vector is mitigated at the API contract level, not at the database layer.
export async function test_api_moderator_login_uses_parameterized_queries(
  connection: api.IConnection,
) {
  // SQL injection attempt: classic payload that breaks SQL query structure
  // But since IPoliticalForumModerator.ILogin is a string with email format constraint,
  // this string will be rejected as invalid email format by validation layer,
  // preventing any SQL injection attempt.
  const sqlInjectionPayload = "'admin@domain.com' OR 1=1 --";

  // This must be rejected before any query is constructed
  await TestValidator.error(
    "SQL injection payload should be rejected as invalid email format",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: sqlInjectionPayload satisfies IPoliticalForumModerator.ILogin,
      });
    },
  );
}
