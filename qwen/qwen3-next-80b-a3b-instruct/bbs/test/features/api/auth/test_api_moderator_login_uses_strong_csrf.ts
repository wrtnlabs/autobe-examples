import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPoliticalForumModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPoliticalForumModerator";

export async function test_api_moderator_login_uses_strong_csrf(
  connection: api.IConnection,
) {
  const credentials =
    `${typia.random<string & tags.Format<"email">>()}:${RandomGenerator.alphaNumeric(16)}` satisfies IPoliticalForumModerator.ILogin;

  // Send malicious request without Origin header
  await TestValidator.error(
    "CSRF attack attempt should be rejected",
    async () => {
      // Use the same connection but explicitly remove Origin header
      const origHeaders = connection.headers;
      const headersWithoutOrigin = { ...origHeaders };
      delete headersWithoutOrigin.Origin;

      const maliciousConnection: api.IConnection = {
        ...connection,
        headers: headersWithoutOrigin,
      };

      await api.functional.auth.moderator.login(maliciousConnection, {
        body: credentials,
      });
    },
  );

  // Verify request with proper Origin header works
  const authorized: IPoliticalForumModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: credentials,
    });
  typia.assert(authorized);
}
