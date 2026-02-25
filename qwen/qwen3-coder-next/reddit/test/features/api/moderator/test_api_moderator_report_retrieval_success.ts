import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneContentComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentComment";
import type { IRedditCloneContentPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentPost";
import type { IRedditCloneContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneContentReport";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneModeratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorAssignment";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test successful retrieval of a content report by a moderator. This scenario
 * validates that moderators can access detailed information about reports
 * including the reporter (member), reported content (post or comment with
 * preview), reason text, status (pending/approved/dismissed), and timestamps.
 * The test should verify proper authorization by confirming the moderator can
 * access reports from their assigned communities.
 */
export async function test_api_moderator_report_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create moderator account
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: "moderator@test.com",
      password: "SecurePass123!",
      username: "moderator123",
      displayName: "Moderator User",
    } satisfies IRedditCloneModerator.IJoin,
  });
  typia.assert(moderator);
  // Generate a random report ID for testing
  const reportId = typia.random<string & tags.Format<"uuid">>();
  // Test: Retrieve report details for moderator
  const retrievedReport = await api.functional.redditClone.moderator.reports.at(
    moderatorConnection,
    {
      reportId: reportId,
    },
  );
  typia.assert(retrievedReport);
  // Validate: Check report structure matches expected DTO
  TestValidator.equals("report type", retrievedReport.reportType, "post");
  TestValidator.equals("report status", retrievedReport.status, "pending");
  TestValidator.equals(
    "reporter username",
    retrievedReport.reporter.username,
    "reporter123",
  );
  // Validate: Check timestamps
  const createdAt = new Date(retrievedReport.createdAt);
  const now = new Date();
  TestValidator.predicate(
    "created at is recent",
    now.getTime() - createdAt.getTime() < 10000,
  );
}
