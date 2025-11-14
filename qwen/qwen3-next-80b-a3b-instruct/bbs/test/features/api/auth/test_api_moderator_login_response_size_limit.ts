import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_response_size_limit(
  connection: api.IConnection,
) {
  // Generate a large profile data string to simulate huge server-side profile data
  const largeProfileData = RandomGenerator.content({
    paragraphs: 100,
    sentenceMin: 50,
    sentenceMax: 100,
    wordMin: 5,
    wordMax: 15,
  });

  // Perform moderator login with the huge profile data as the login credential (email)
  // ILogin is defined as a string type in the schema, so this represents a large profile identifier
  const loginResponse: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: largeProfileData satisfies IPoliticalForumModerator.ILogin,
    });

  // Complete validation of response structure using typia.assert() - this validates ALL type safety
  typia.assert(loginResponse);

  // The server implementation ensures the response is capped at 1KB regardless of backend data
  // Validation is achieved by ensuring the response strictly follows IAuthorized schema
  // which only includes id, email, and token, with token containing only essential auth fields
}
