import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_forced_unicode_normalization(
  connection: api.IConnection,
) {
  const decomposedEmail = "e\u0301@example.com"; // e followed by combining acute accent
  const composedEmail = "é@example.com"; // Composed e-acute character
  const password = "password123";

  // First, create a moderator account with the composed email
  const registration = await api.functional.auth.moderator.login(connection, {
    body: composedEmail,
  });
  typia.assert(registration);

  // Then attempt to login with decomposed form — system should normalize and match
  const loginResponse = await api.functional.auth.moderator.login(connection, {
    body: decomposedEmail,
  });
  typia.assert(loginResponse);

  // Validate that login with decomposed form returns the composed email form
  TestValidator.equals(
    "decomposed email normalized to stored form",
    loginResponse.email,
    composedEmail,
  );
}
