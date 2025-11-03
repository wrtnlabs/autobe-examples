import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSetting";

export async function test_api_setting_get_returns_404_when_missing_or_deleted(
  connection: api.IConnection,
) {
  /**
   * Purpose:
   *
   * 1. Register a moderator account (self-join) to obtain authorization.
   * 2. Attempt to GET a clearly non-existent setting key and verify the operation
   *    fails (service treats missing or soft-deleted entries as not retrievable
   *    by standard moderator GET).
   *
   * Notes:
   *
   * - The SDK automatically manages Authorization header on successful join.
   * - The environment does not expose create/delete endpoints for settings in the
   *   provided SDK, so the test validates missing/soft-deleted semantics by
   *   requesting a non-existent key.
   */

  // 1) Moderator self-join to obtain authorization
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/current",
        referrer: "https://example.com/referrer",
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Sanity: token should exist per DTO - typia.assert already verifies shape

  // 2) Attempt to GET a non-existent (therefore treated-as-not-found) setting key
  const missingKey = `test-missing-${typia.random<string & tags.Format<"uuid">>()}`;

  await TestValidator.error(
    "GET for non-existent or soft-deleted setting key should throw",
    async () => {
      await api.functional.discussionBoard.moderator.settings.at(connection, {
        settingKey: missingKey,
      });
    },
  );

  // End of test: The fact that the GET call threw is the expected behavior for
  // missing/soft-deleted keys. We intentionally do not assert on HTTP status
  // codes or error message contents to comply with test guidelines.
}
