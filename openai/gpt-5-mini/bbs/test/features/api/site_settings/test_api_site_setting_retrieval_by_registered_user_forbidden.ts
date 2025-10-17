import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalForumRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumRegisteredUser";
import type { IEconPoliticalForumSiteSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalForumSiteSetting";

export async function test_api_site_setting_retrieval_by_registered_user_forbidden(
  connection: api.IConnection,
) {
  /**
   * Validate that a regular registered user cannot retrieve administrator-only
   * site setting details (expects HTTP 403 Forbidden).
   *
   * Preconditions (test harness responsibility):
   *
   * - A site setting with UUID equal to process.env.TEST_SITE_SETTING_ID must
   *   exist in the seeded test database. If not set, this test falls back to
   *   the default UUID: "00000000-0000-0000-0000-000000000001" which the test
   *   harness SHOULD seed for CI runs.
   */

  // 1) Register a new regular user
  const joinBody = {
    username: RandomGenerator.alphaNumeric(8),
    email: typia.random<string & tags.Format<"email">>(),
    password: `P@ssw0rd-${RandomGenerator.alphaNumeric(6)}`,
    display_name: RandomGenerator.name(),
  } satisfies IEconPoliticalForumRegisteredUser.IJoin;

  const authorized: IEconPoliticalForumRegisteredUser.IAuthorized =
    await api.functional.auth.registeredUser.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2) Resolve target siteSettingId from environment with a documented fallback
  const siteSettingId = (process.env.TEST_SITE_SETTING_ID ??
    "00000000-0000-0000-0000-000000000001") satisfies string &
    tags.Format<"uuid">;

  // 3) Attempt to retrieve the admin-only site setting as a regular user.
  // Expect 403 Forbidden.
  await TestValidator.httpError(
    "registered user cannot retrieve admin-only site setting",
    403,
    async () => {
      await api.functional.econPoliticalForum.administrator.siteSettings.at(
        connection,
        {
          siteSettingId,
        },
      );
    },
  );
}
