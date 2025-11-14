import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_rejects_unicode_spoofing(
  connection: api.IConnection,
) {
  // Arrange: Create email with Unicode homoglyphs (Cyrillic 'а' instead of Latin 'a')
  const spoofedEmail = "mоdеrаtоr@domain.com"; // Contains Cyrillic 'о', 'е', 'а' characters

  // Act: Attempt to login with spoofed email
  await TestValidator.error(
    "Unicode spoofing with Cyrillic homoglyphs should be rejected",
    async () => {
      await api.functional.auth.moderator.login(connection, {
        body: spoofedEmail,
      });
    },
  );
}
