import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test the soft-delete logic for a community platform report by a moderator.
 *
 * 1. Register a new moderator (join API) for platform authentication.
 * 2. (Assume test report exists.)
 * 3. Soft-delete the report with the erase API as moderator.
 * 4. Validate: returned report's deleted_at is set, id matches input.
 * 5. Error test: deleting already deleted report should error.
 * 6. Error test: unauthorized connection cannot delete report.
 */
export async function test_api_report_soft_delete_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a moderator
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10);
  const href = "https://example.com/register";
  const referrer = "https://google.com";
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      status: "active",
      href,
      referrer,
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 2. Simulate an existing report (generate ID and call erase)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Soft-delete the report
  const result = await api.functional.communityPlatform.moderator.reports.erase(
    connection,
    { reportId },
  );
  typia.assert(result);
  // Validate: deleted_at is set, id matches
  TestValidator.equals(
    "deleted_at field is set",
    typeof result.deleted_at,
    "string",
  );
  TestValidator.equals("report id matches", result.id, reportId);

  // 4. Attempt to delete already deleted report (should error)
  await TestValidator.error("double delete triggers error", async () => {
    await api.functional.communityPlatform.moderator.reports.erase(connection, {
      reportId,
    });
  });

  // 5. Attempt to delete as unauthenticated user (should error)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated moderator cannot delete report",
    async () => {
      await api.functional.communityPlatform.moderator.reports.erase(
        unauthConn,
        { reportId },
      );
    },
  );
}
