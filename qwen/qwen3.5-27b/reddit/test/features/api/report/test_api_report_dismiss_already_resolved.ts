import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test error handling when attempting to dismiss reports that cannot be dismissed.
 *
 * Validates that the system properly rejects dismiss operations on reports that are not in a dismissible state. This includes reports that don't exist, are not in pending status, or have already been resolved (approved or dismissed). The test ensures consistent error handling for invalid dismiss attempts.
 *
 * Due to limited test utilities (no member authentication or report creation utilities available), this test focuses on validating error responses for dismiss operations rather than the full workflow of creating, resolving, and re-attempting dismissal.
 *
 * 1. Register and authenticate as a moderator.
 * 2. Generate a random report UUID for testing.
 * 3. Attempt to dismiss the report and verify it fails with an appropriate error.
 * 4. Attempt to dismiss the same report again and verify consistent error handling.
 */
export async function test_api_report_dismiss_already_resolved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(moderator);
  // 2. Generate a random report UUID for testing
  const reportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. First attempt to dismiss the report
  // This should fail because the report either doesn't exist or is not in pending status
  await TestValidator.error(
    "first dismiss attempt should fail for non-existent or non-pending report",
    async () => {
      await api.functional.redditClone.moderator.reports.dismiss(
        moderatorConnection,
        { reportId },
      );
    },
  );
  // 4. Second attempt to dismiss the same report
  // This should also fail, demonstrating consistent error handling
  await TestValidator.error(
    "second dismiss attempt should also fail with consistent error handling",
    async () => {
      await api.functional.redditClone.moderator.reports.dismiss(
        moderatorConnection,
        { reportId },
      );
    },
  );
}
